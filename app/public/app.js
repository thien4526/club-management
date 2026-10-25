const SCHEMA = {
  members: { label: 'Thành viên', fields: [
    ['full_name', 'Họ tên', 'text'], ['email', 'Email', 'email'], ['phone', 'SĐT', 'text'],
    ['role', 'Chức vụ', 'text'], ['joined_date', 'Ngày tham gia', 'date']] },
  activities: { label: 'Hoạt động', fields: [
    ['title', 'Tên hoạt động', 'text'], ['description', 'Mô tả', 'text'],
    ['activity_date', 'Ngày', 'date'], ['location', 'Địa điểm', 'text']] },
  contributions: { label: 'Đóng góp', fields: [
    ['member_id', 'Thành viên', 'select'], ['amount', 'Số tiền (VND)', 'number'],
    ['contribution_date', 'Ngày', 'date'], ['note', 'Ghi chú', 'text']] },
  meetings: { label: 'Lịch họp', fields: [
    ['title', 'Nội dung', 'text'], ['meeting_time', 'Thời gian', 'datetime-local'],
    ['location', 'Địa điểm', 'text'], ['agenda', 'Chương trình', 'text']] },
};

let current = 'members';
let editingId = null;
let members = [];

const $ = (id) => document.getElementById(id);

async function api(path, options) {
  const res = await fetch('/api/' + path, {
    headers: { 'Content-Type': 'application/json' }, ...options,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Lỗi');
  return res.json();
}

function el(tag, props = {}, ...children) {
  const e = document.createElement(tag);
  Object.assign(e, props);
  children.forEach((c) => e.append(c));
  return e;
}

function toInput(type, v) {
  if (v == null) return '';
  if (type === 'datetime-local') return String(v).replace(' ', 'T').slice(0, 16);
  return v;
}

function renderTabs() {
  const nav = $('tabs');
  nav.replaceChildren();
  Object.entries(SCHEMA).forEach(([key, s]) => {
    const b = el('button', { textContent: s.label, className: key === current ? 'active' : '' });
    b.onclick = () => { current = key; editingId = null; load(); };
    nav.append(b);
  });
}

function renderForm(row) {
  const form = $('form');
  form.replaceChildren();
  SCHEMA[current].fields.forEach(([name, label, type]) => {
    let input;
    if (type === 'select') {
      input = el('select', { name, required: true });
      members.forEach((m) => input.append(el('option', { value: m.id, textContent: m.full_name })));
    } else {
      input = el('input', { name, type });
      if (type === 'number') input.min = 0;
    }
    if (row) input.value = toInput(type, row[name]);
    form.append(el('label', {}, label, input));
  });
  form.append(el('button', { className: 'primary', type: 'submit', textContent: editingId ? 'Lưu' : 'Thêm' }));
  if (editingId) {
    const cancel = el('button', { className: 'small', type: 'button', textContent: 'Hủy' });
    cancel.onclick = () => { editingId = null; renderForm(); };
    form.append(cancel);
  }
}

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {};
  SCHEMA[current].fields.forEach(([name, , type]) => {
    let v = e.target.elements[name].value;
    if (type === 'datetime-local' && v) v = v.replace('T', ' ') + ':00';
    body[name] = v;
  });
  try {
    await api(editingId ? `${current}/${editingId}` : current, {
      method: editingId ? 'PUT' : 'POST', body: JSON.stringify(body),
    });
    editingId = null;
    load();
  } catch (err) { alert(err.message); }
});

function renderTable(rows) {
  const t = $('table');
  t.replaceChildren();
  const fields = SCHEMA[current].fields;
  const head = el('tr', {});
  fields.forEach(([, label]) => head.append(el('th', { textContent: label })));
  head.append(el('th', { textContent: '' }));
  t.append(head);
  rows.forEach((row) => {
    const tr = el('tr', {});
    fields.forEach(([name, , type]) => {
      let v = name === 'member_id' ? row.member_name : row[name];
      if (type === 'number' && v != null) v = Number(v).toLocaleString('vi-VN');
      tr.append(el('td', { textContent: v == null ? '' : v }));
    });
    const actions = el('td', {});
    const edit = el('button', { className: 'small', textContent: 'Sửa' });
    edit.onclick = () => { editingId = row.id; renderForm(row); window.scrollTo(0, 0); };
    const del = el('button', { className: 'small danger', textContent: 'Xóa' });
    del.onclick = async () => {
      if (!confirm('Xóa dòng này?')) return;
      await api(`${current}/${row.id}`, { method: 'DELETE' });
      load();
    };
    actions.append(edit, del);
    tr.append(actions);
    t.append(tr);
  });
}

async function load() {
  renderTabs();
  $('title').textContent = SCHEMA[current].label;
  if (current === 'contributions') members = await api('members');
  renderForm();
  renderTable(await api(current));
  const s = await api('summary');
  $('summary').textContent =
    `${s.members} thành viên · ${s.activities} hoạt động · Tổng đóng góp: ${s.total_contributions.toLocaleString('vi-VN')} VND`;
}

load();
