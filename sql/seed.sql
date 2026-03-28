USE BrokenArrowDB;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE bookings;
TRUNCATE TABLE availability_overrides;
TRUNCATE TABLE availability_rules;
TRUNCATE TABLE booking_questions;
TRUNCATE TABLE event_types;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO event_types (
  id,
  title,
  description,
  duration_minutes,
  slug,
  is_hidden,
  buffer_before,
  buffer_after,
  color,
  location_label,
  timezone
) VALUES
  (
    1,
    'Discovery Call',
    'A short intro call to understand goals, timelines, and project scope.',
    30,
    'discovery-call',
    0,
    10,
    10,
    '#f97316',
    'Google Meet',
    'Asia/Kolkata'
  ),
  (
    2,
    'Product Strategy Session',
    'A deeper working session focused on roadmap, UX direction, and delivery planning.',
    60,
    'product-strategy-session',
    0,
    15,
    15,
    '#0ea5e9',
    'Zoom',
    'Asia/Kolkata'
  ),
  (
    3,
    'Private Client Review',
    'A hidden invite-only review session for existing retained clients.',
    45,
    'private-client-review',
    1,
    10,
    5,
    '#22c55e',
    'Google Meet',
    'Asia/Kolkata'
  );

INSERT INTO booking_questions (
  id,
  event_type_id,
  label,
  field_type,
  is_required,
  sort_order
) VALUES
  (1, 1, 'What would you like to discuss?', 'textarea', 1, 0),
  (2, 1, 'Do you already have a deadline in mind?', 'text', 0, 1),
  (3, 2, 'Which product area needs the most attention?', 'text', 1, 0),
  (4, 2, 'Please share any useful links before the meeting.', 'textarea', 0, 1),
  (5, 3, 'What feedback would you like reviewed?', 'textarea', 1, 0);

INSERT INTO availability_rules (
  id,
  event_type_id,
  schedule_name,
  weekday,
  start_time,
  end_time,
  timezone
) VALUES
  (1, 1, 'Weekday mornings', 1, '09:00:00', '12:00:00', 'Asia/Kolkata'),
  (2, 1, 'Weekday mornings', 2, '09:00:00', '12:00:00', 'Asia/Kolkata'),
  (3, 1, 'Weekday mornings', 3, '09:00:00', '12:00:00', 'Asia/Kolkata'),
  (4, 1, 'Weekday mornings', 4, '09:00:00', '12:00:00', 'Asia/Kolkata'),
  (5, 1, 'Weekday mornings', 5, '09:00:00', '12:00:00', 'Asia/Kolkata'),
  (6, 2, 'Core workday', 1, '13:00:00', '18:00:00', 'Asia/Kolkata'),
  (7, 2, 'Core workday', 2, '13:00:00', '18:00:00', 'Asia/Kolkata'),
  (8, 2, 'Core workday', 3, '13:00:00', '18:00:00', 'Asia/Kolkata'),
  (9, 2, 'Core workday', 4, '13:00:00', '18:00:00', 'Asia/Kolkata'),
  (10, 2, 'Core workday', 5, '13:00:00', '18:00:00', 'Asia/Kolkata'),
  (11, 3, 'Client-only block', 2, '16:00:00', '19:00:00', 'Asia/Kolkata'),
  (12, 3, 'Client-only block', 4, '16:00:00', '19:00:00', 'Asia/Kolkata');

INSERT INTO availability_overrides (
  id,
  event_type_id,
  override_date,
  is_blocked,
  start_time,
  end_time,
  timezone,
  note
) VALUES
  (
    1,
    1,
    DATE_ADD(CURDATE(), INTERVAL 2 DAY),
    1,
    NULL,
    NULL,
    'Asia/Kolkata',
    'Blocked for internal planning'
  ),
  (
    2,
    2,
    DATE_ADD(CURDATE(), INTERVAL 4 DAY),
    0,
    '15:00:00',
    '18:30:00',
    'Asia/Kolkata',
    'Extended afternoon hours for client workshop week'
  ),
  (
    3,
    3,
    DATE_ADD(CURDATE(), INTERVAL 6 DAY),
    0,
    '17:00:00',
    '20:00:00',
    'Asia/Kolkata',
    'Evening review slot for key account'
  );

INSERT INTO bookings (
  id,
  event_type_id,
  booking_reference,
  booker_name,
  booker_email,
  answers,
  starts_at,
  ends_at,
  timezone,
  status,
  cancelled_at,
  cancellation_reason,
  rescheduled_from_booking_id
) VALUES
  (
    1,
    1,
    'DISC-1001',
    'Riya Sharma',
    'riya.sharma@example.com',
    JSON_ARRAY(
      JSON_OBJECT('questionId', 1, 'value', 'Need help planning a redesign kickoff.'),
      JSON_OBJECT('questionId', 2, 'value', 'Within the next 3 weeks')
    ),
    DATE_ADD(DATE_ADD(CURDATE(), INTERVAL 1 DAY), INTERVAL 9 HOUR),
    DATE_ADD(DATE_ADD(DATE_ADD(CURDATE(), INTERVAL 1 DAY), INTERVAL 9 HOUR), INTERVAL 30 MINUTE),
    'Asia/Kolkata',
    'scheduled',
    NULL,
    NULL,
    NULL
  ),
  (
    2,
    2,
    'STRAT-1002',
    'Arjun Mehta',
    'arjun.mehta@example.com',
    JSON_ARRAY(
      JSON_OBJECT('questionId', 3, 'value', 'Onboarding and activation funnel'),
      JSON_OBJECT('questionId', 4, 'value', 'https://example.com/notion-doc')
    ),
    DATE_ADD(DATE_ADD(CURDATE(), INTERVAL 3 DAY), INTERVAL 14 HOUR),
    DATE_ADD(DATE_ADD(CURDATE(), INTERVAL 3 DAY), INTERVAL 15 HOUR),
    'Asia/Kolkata',
    'scheduled',
    NULL,
    NULL,
    NULL
  ),
  (
    3,
    1,
    'DISC-1003',
    'Neha Kapoor',
    'neha.kapoor@example.com',
    JSON_ARRAY(
      JSON_OBJECT('questionId', 1, 'value', 'Website discovery for a SaaS launch')
    ),
    DATE_SUB(DATE_ADD(CURDATE(), INTERVAL 11 HOUR), INTERVAL 2 DAY),
    DATE_SUB(DATE_ADD(DATE_ADD(CURDATE(), INTERVAL 11 HOUR), INTERVAL 30 MINUTE), INTERVAL 2 DAY),
    'Asia/Kolkata',
    'scheduled',
    NULL,
    NULL,
    NULL
  ),
  (
    4,
    2,
    'STRAT-1004',
    'Kabir Rao',
    'kabir.rao@example.com',
    JSON_ARRAY(
      JSON_OBJECT('questionId', 3, 'value', 'Roadmap alignment across two products')
    ),
    DATE_ADD(DATE_ADD(CURDATE(), INTERVAL 5 DAY), INTERVAL 15 HOUR),
    DATE_ADD(DATE_ADD(CURDATE(), INTERVAL 5 DAY), INTERVAL 16 HOUR),
    'Asia/Kolkata',
    'cancelled',
    NOW(),
    'Rescheduled to a later slot',
    NULL
  ),
  (
    5,
    2,
    'STRAT-1005',
    'Kabir Rao',
    'kabir.rao@example.com',
    JSON_ARRAY(
      JSON_OBJECT('questionId', 3, 'value', 'Roadmap alignment across two products'),
      JSON_OBJECT('questionId', 4, 'value', 'Follow-up after cancellation')
    ),
    DATE_ADD(DATE_ADD(CURDATE(), INTERVAL 6 DAY), INTERVAL 16 HOUR),
    DATE_ADD(DATE_ADD(CURDATE(), INTERVAL 6 DAY), INTERVAL 17 HOUR),
    'Asia/Kolkata',
    'scheduled',
    NULL,
    NULL,
    4
  ),
  (
    6,
    3,
    'PRIV-1006',
    'Aisha Khan',
    'aisha.khan@example.com',
    JSON_ARRAY(
      JSON_OBJECT('questionId', 5, 'value', 'Need final feedback before client sign-off')
    ),
    DATE_ADD(DATE_ADD(CURDATE(), INTERVAL 7 DAY), INTERVAL 17 HOUR),
    DATE_ADD(DATE_ADD(DATE_ADD(CURDATE(), INTERVAL 7 DAY), INTERVAL 17 HOUR), INTERVAL 45 MINUTE),
    'Asia/Kolkata',
    'scheduled',
    NULL,
    NULL,
    NULL
  );
