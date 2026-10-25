SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  role VARCHAR(50) DEFAULT 'Thành viên',
  joined_date DATE
) CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  activity_date DATE,
  location VARCHAR(150)
) CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS contributions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  amount DECIMAL(12,0) NOT NULL,
  contribution_date DATE,
  note VARCHAR(255),
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS meetings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  meeting_time DATETIME,
  location VARCHAR(150),
  agenda TEXT
) CHARACTER SET utf8mb4;

INSERT INTO members (full_name, email, phone, role, joined_date) VALUES
 ('Nguyễn Văn An', 'an@example.com', '0900000001', 'Chủ nhiệm', '2025-09-01'),
 ('Trần Thị Bình', 'binh@example.com', '0900000002', 'Thủ quỹ', '2025-09-01'),
 ('Lê Minh Châu', 'chau@example.com', '0900000003', 'Thành viên', '2025-10-05');

INSERT INTO activities (title, description, activity_date, location) VALUES
 ('Chào đón thành viên mới', 'Giao lưu và giới thiệu CLB', '2026-10-30', 'Phòng A101'),
 ('Workshop DevOps cơ bản', 'Docker, Nginx, Grafana', '2026-11-10', 'Phòng Lab 2');

INSERT INTO contributions (member_id, amount, contribution_date, note) VALUES
 (1, 100000, '2026-10-01', 'Quỹ tháng 10'),
 (2, 100000, '2026-10-01', 'Quỹ tháng 10');

INSERT INTO meetings (title, meeting_time, location, agenda) VALUES
 ('Họp ban chủ nhiệm', '2026-11-01 19:00:00', 'Google Meet', 'Tổng kết tháng 10, kế hoạch tháng 11');
