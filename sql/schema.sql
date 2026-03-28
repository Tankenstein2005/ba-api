CREATE DATABASE IF NOT EXISTS BrokenArrowDB;
USE BrokenArrowDB;

CREATE TABLE IF NOT EXISTS event_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  duration_minutes INT NOT NULL,
  slug VARCHAR(150) NOT NULL UNIQUE,
  is_hidden TINYINT(1) NOT NULL DEFAULT 0,
  buffer_before INT NOT NULL DEFAULT 0,
  buffer_after INT NOT NULL DEFAULT 0,
  color VARCHAR(20) NOT NULL DEFAULT '#f97316',
  location_label VARCHAR(120) DEFAULT 'Google Meet',
  timezone VARCHAR(80) NOT NULL DEFAULT 'Asia/Kolkata',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS booking_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_type_id INT NOT NULL,
  label VARCHAR(150) NOT NULL,
  field_type VARCHAR(40) NOT NULL DEFAULT 'text',
  is_required TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (event_type_id) REFERENCES event_types(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS availability_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_type_id INT NOT NULL,
  schedule_name VARCHAR(120) NOT NULL DEFAULT 'Default schedule',
  weekday INT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone VARCHAR(80) NOT NULL,
  FOREIGN KEY (event_type_id) REFERENCES event_types(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS availability_overrides (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_type_id INT NOT NULL,
  override_date DATE NOT NULL,
  is_blocked TINYINT(1) NOT NULL DEFAULT 0,
  start_time TIME NULL,
  end_time TIME NULL,
  timezone VARCHAR(80) NOT NULL,
  note VARCHAR(255),
  FOREIGN KEY (event_type_id) REFERENCES event_types(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_type_id INT NOT NULL,
  booking_reference VARCHAR(36) NOT NULL UNIQUE,
  booker_name VARCHAR(120) NOT NULL,
  booker_email VARCHAR(180) NOT NULL,
  answers JSON NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  timezone VARCHAR(80) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  cancelled_at DATETIME NULL,
  cancellation_reason VARCHAR(255) NULL,
  rescheduled_from_booking_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (event_type_id) REFERENCES event_types(id) ON DELETE CASCADE,
  FOREIGN KEY (rescheduled_from_booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);
