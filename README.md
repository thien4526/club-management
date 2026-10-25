# Hệ thống Quản lý Câu lạc bộ (Đề 39)

Express + MySQL + phpMyAdmin, Nginx reverse proxy, Prometheus + Grafana, Loki + Promtail.

## Chạy
    cp .env.example .env      # đổi mật khẩu trong .env
    docker compose up -d --build
    docker compose ps

## Địa chỉ
- Web CLB:     http://localhost
- phpMyAdmin:  http://localhost/phpmyadmin/   (user/pass trong .env)
- Grafana:     http://localhost/grafana/      (admin / GRAFANA_ADMIN_PASSWORD)
- Prometheus:  http://localhost:9090          (chỉ truy cập từ máy local)

## LogQL mẫu (Grafana > Explore > Loki)
    {service="app"}
    {service="app"} | json | status >= 400
    sum by (service) (rate({job="docker"}[1m]))

## Hardening
- DB không mở cổng ra ngoài, tách 3 network (frontend/backend/monitoring)
- Nginx: ẩn version, giới hạn tốc độ, chặn /metrics từ ngoài
- Container app chạy user không phải root, no-new-privileges
- Mật khẩu nằm trong .env (không đưa lên GitHub)
