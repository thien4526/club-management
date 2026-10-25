const express = require('express');
const mysql = require('mysql2/promise');
const client = require('prom-client');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
  charset: 'utf8mb4',
});

// ---- Prometheus metrics ----
client.collectDefaultMetrics();
const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Thoi gian xu ly request',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2],
});
const httpTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Tong so request',
  labelNames: ['method', 'route', 'status'],
});

// ---- Logging JSON (Loki doc tu stdout) + do metrics ----
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const sec = Number(process.hrtime.bigint() - start) / 1e9;
    const route = req.route ? req.baseUrl + req.route.path : 'static_or_unmatched';
    const labels = { method: req.method, route, status: res.statusCode };
    httpDuration.observe(labels, sec);
    httpTotal.inc(labels);
    if (req.path !== '/metrics' && req.path !== '/health') {
      console.log(JSON.stringify({
        level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
        method: req.method, url: req.originalUrl, status: res.statusCode,
        ms: Math.round(sec * 1000), ip: req.headers['x-real-ip'] || req.ip,
      }));
    }
  });
  next();
});

// ---- Header bao mat cho web CLB ----
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

const TABLES = {
  members: {
    cols: ['full_name', 'email', 'phone', 'role', 'joined_date'], required: ['full_name'],
    list: 'SELECT * FROM members ORDER BY id DESC',
  },
  activities: {
    cols: ['title', 'description', 'activity_date', 'location'], required: ['title'],
    list: 'SELECT * FROM activities ORDER BY activity_date DESC, id DESC',
  },
  contributions: {
    cols: ['member_id', 'amount', 'contribution_date', 'note'], required: ['member_id', 'amount'],
    list: 'SELECT c.*, m.full_name AS member_name FROM contributions c JOIN members m ON m.id = c.member_id ORDER BY c.id DESC',
  },
  meetings: {
    cols: ['title', 'meeting_time', 'location', 'agenda'], required: ['title'],
    list: 'SELECT * FROM meetings ORDER BY meeting_time DESC, id DESC',
  },
};

const wrap = (fn) => async (req, res) => {
  try { await fn(req, res); }
  catch (err) {
    console.error(JSON.stringify({ level: 'error', msg: err.message }));
    res.status(500).json({ error: 'Loi may chu' });
  }
};

app.get('/health', (req, res) => res.send('ok'));
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.get('/api/summary', wrap(async (req, res) => {
  const [[m]] = await pool.query('SELECT COUNT(*) AS n FROM members');
  const [[a]] = await pool.query('SELECT COUNT(*) AS n FROM activities');
  const [[c]] = await pool.query('SELECT COALESCE(SUM(amount),0) AS total FROM contributions');
  res.json({ members: m.n, activities: a.n, total_contributions: Number(c.total) });
}));

function pick(table, body) {
  const t = TABLES[table];
  const data = {};
  for (const col of t.cols) {
    if (body[col] !== undefined) data[col] = body[col] === '' ? null : body[col];
  }
  return data;
}

app.get('/api/:table', wrap(async (req, res) => {
  const t = TABLES[req.params.table];
  if (!t) return res.status(404).json({ error: 'Khong ton tai' });
  const [rows] = await pool.query(t.list);
  res.json(rows);
}));

app.post('/api/:table', wrap(async (req, res) => {
  const t = TABLES[req.params.table];
  if (!t) return res.status(404).json({ error: 'Khong ton tai' });
  const data = pick(req.params.table, req.body || {});
  if (t.required.some((k) => data[k] === undefined || data[k] === null)) {
    return res.status(400).json({ error: 'Thieu du lieu bat buoc' });
  }
  try {
    const [r] = await pool.query(`INSERT INTO ${req.params.table} SET ?`, [data]);
    res.status(201).json({ id: r.insertId });
  } catch (e) {
    res.status(400).json({ error: 'Du lieu khong hop le' });
  }
}));

app.put('/api/:table/:id', wrap(async (req, res) => {
  const t = TABLES[req.params.table];
  if (!t) return res.status(404).json({ error: 'Khong ton tai' });
  const data = pick(req.params.table, req.body || {});
  if (!Object.keys(data).length) return res.status(400).json({ error: 'Khong co du lieu' });
  try {
    await pool.query(`UPDATE ${req.params.table} SET ? WHERE id = ?`, [data, req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: 'Du lieu khong hop le' });
  }
}));

app.delete('/api/:table/:id', wrap(async (req, res) => {
  const t = TABLES[req.params.table];
  if (!t) return res.status(404).json({ error: 'Khong ton tai' });
  await pool.query(`DELETE FROM ${req.params.table} WHERE id = ?`, [req.params.id]);
  res.json({ ok: true });
}));

app.use(express.static('public'));

app.listen(3000, () => console.log(JSON.stringify({ level: 'info', msg: 'Club app listening on 3000' })));
