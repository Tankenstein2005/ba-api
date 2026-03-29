import { pool } from "../db/pool.js";
import { env } from "../config/env.js";
import * as demoStore from "../data/demoStore.js";
import { httpError } from "../utils/httpError.js";
import {
  bookingStatusWindow,
  makeTimeSlots,
  toSqlDate
} from "../utils/time.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { nanoid } from "nanoid";

dayjs.extend(utc);
dayjs.extend(timezone);

const databaseUnavailableCodes = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "PROTOCOL_CONNECTION_LOST",
  "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR"
]);

function buildPublicLink(slug) {
  if (env.publicClientUrl) {
    return `${env.publicClientUrl}/book/${slug}`;
  }

  return `/book/${slug}`;
}

function shouldUseDemoStore(error) {
  if (env.forceDemoData) {
    return true;
  }

  if (!error || error.status) {
    return false;
  }

  if (databaseUnavailableCodes.has(error.code)) {
    return true;
  }

  const message = String(error.message || "");

  return /connect ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EHOSTUNREACH|Can't reach database/i.test(
    message
  );
}

async function withDataSource(databaseOperation, demoOperation) {
  if (env.forceDemoData) {
    return demoOperation();
  }

  try {
    return await databaseOperation();
  } catch (error) {
    if (!shouldUseDemoStore(error)) {
      throw error;
    }

    return demoOperation();
  }
}

async function getEventTypeById(id) {
  const [rows] = await pool.query("SELECT * FROM event_types WHERE id = ?", [
    id
  ]);
  return rows[0];
}

async function getEventTypeBySlug(slug) {
  const [rows] = await pool.query(
    "SELECT * FROM event_types WHERE slug = ? AND is_hidden = 0",
    [slug]
  );
  return rows[0];
}

async function replaceAvailability(connection, eventTypeId, availability = []) {
  await connection.query(
    "DELETE FROM availability_rules WHERE event_type_id = ?",
    [eventTypeId]
  );
  if (!availability.length) return;
  const values = availability.map((rule) => [
    eventTypeId,
    rule.scheduleName || "Default schedule",
    rule.weekday,
    rule.startTime,
    rule.endTime,
    rule.timezone || env.defaultTimezone
  ]);
  await connection.query(
    `INSERT INTO availability_rules
      (event_type_id, schedule_name, weekday, start_time, end_time, timezone)
      VALUES ?`,
    [values]
  );
}

async function replaceOverrides(connection, eventTypeId, overrides = []) {
  await connection.query(
    "DELETE FROM availability_overrides WHERE event_type_id = ?",
    [eventTypeId]
  );
  if (!overrides.length) return;
  const values = overrides.map((override) => [
    eventTypeId,
    override.overrideDate,
    override.isBlocked ? 1 : 0,
    override.startTime || null,
    override.endTime || null,
    override.timezone || env.defaultTimezone,
    override.note || null
  ]);
  await connection.query(
    `INSERT INTO availability_overrides
      (event_type_id, override_date, is_blocked, start_time, end_time, timezone, note)
      VALUES ?`,
    [values]
  );
}

async function replaceQuestions(connection, eventTypeId, questions = []) {
  await connection.query(
    "DELETE FROM booking_questions WHERE event_type_id = ?",
    [eventTypeId]
  );
  if (!questions.length) return;
  const values = questions.map((question, index) => [
    eventTypeId,
    question.label,
    question.fieldType || "text",
    question.isRequired ? 1 : 0,
    index
  ]);
  await connection.query(
    `INSERT INTO booking_questions
      (event_type_id, label, field_type, is_required, sort_order)
      VALUES ?`,
    [values]
  );
}

export async function listEventTypes() {
  return withDataSource(async () => {
    const [rows] = await pool.query(`
      SELECT
        e.*,
        COUNT(DISTINCT b.id) AS bookings_count
      FROM event_types e
      LEFT JOIN bookings b ON b.event_type_id = e.id AND b.status = 'scheduled'
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `);
    return rows.map((row) => ({
      ...row,
      publicLink: buildPublicLink(row.slug)
    }));
  }, demoStore.listEventTypes);
}

export async function getEventTypeDetail(id) {
  return withDataSource(async () => {
    const eventType = await getEventTypeById(id);
    if (!eventType) throw httpError(404, "Event type not found.");
    const [availability] = await pool.query(
      "SELECT * FROM availability_rules WHERE event_type_id = ? ORDER BY weekday, start_time",
      [id]
    );
    const [overrides] = await pool.query(
      "SELECT * FROM availability_overrides WHERE event_type_id = ? ORDER BY override_date",
      [id]
    );
    const [questions] = await pool.query(
      "SELECT * FROM booking_questions WHERE event_type_id = ? ORDER BY sort_order",
      [id]
    );
    return {
      ...eventType,
      publicLink: buildPublicLink(eventType.slug),
      availability,
      overrides,
      questions
    };
  }, () => demoStore.getEventTypeDetail(id));
}

export async function createEventType(payload) {
  return withDataSource(async () => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.query(
        `INSERT INTO event_types
        (title, description, duration_minutes, slug, is_hidden, buffer_before, buffer_after, color, location_label, timezone)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.title,
          payload.description,
          payload.durationMinutes,
          payload.slug,
          payload.isHidden ? 1 : 0,
          payload.bufferBefore || 0,
          payload.bufferAfter || 0,
          payload.color || "#f97316",
          payload.locationLabel || "Google Meet",
          payload.timezone || env.defaultTimezone
        ]
      );
      await replaceAvailability(
        connection,
        result.insertId,
        payload.availability
      );
      await replaceOverrides(connection, result.insertId, payload.overrides);
      await replaceQuestions(connection, result.insertId, payload.questions);
      await connection.commit();
      return getEventTypeDetail(result.insertId);
    } catch (error) {
      await connection.rollback();
      if (error.code === "ER_DUP_ENTRY")
        throw httpError(409, "Slug already exists.");
      throw error;
    } finally {
      connection.release();
    }
  }, () => demoStore.createEventType(payload));
}

export async function updateEventType(id, payload) {
  return withDataSource(async () => {
    const existing = await getEventTypeById(id);
    if (!existing) throw httpError(404, "Event type not found.");
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(
        `UPDATE event_types
        SET title = ?, description = ?, duration_minutes = ?, slug = ?, is_hidden = ?, buffer_before = ?, buffer_after = ?, color = ?, location_label = ?, timezone = ?
        WHERE id = ?`,
        [
          payload.title,
          payload.description,
          payload.durationMinutes,
          payload.slug,
          payload.isHidden ? 1 : 0,
          payload.bufferBefore || 0,
          payload.bufferAfter || 0,
          payload.color || "#f97316",
          payload.locationLabel || "Google Meet",
          payload.timezone || env.defaultTimezone,
          id
        ]
      );
      await replaceAvailability(connection, id, payload.availability);
      await replaceOverrides(connection, id, payload.overrides);
      await replaceQuestions(connection, id, payload.questions);
      await connection.commit();
      return getEventTypeDetail(id);
    } catch (error) {
      await connection.rollback();
      if (error.code === "ER_DUP_ENTRY")
        throw httpError(409, "Slug already exists.");
      throw error;
    } finally {
      connection.release();
    }
  }, () => demoStore.updateEventType(id, payload));
}

export async function deleteEventType(id) {
  return withDataSource(async () => {
    const [result] = await pool.query("DELETE FROM event_types WHERE id = ?", [
      id
    ]);
    if (!result.affectedRows) throw httpError(404, "Event type not found.");
  }, () => demoStore.deleteEventType(id));
}

export async function listBookings() {
  return withDataSource(async () => {
    const [rows] = await pool.query(`
      SELECT b.*, e.title AS event_title, e.slug AS event_slug
      FROM bookings b
      INNER JOIN event_types e ON e.id = b.event_type_id
      ORDER BY b.starts_at ASC
    `);
    return rows.reduce(
      (acc, booking) => {
        if (booking.status !== "scheduled") {
          acc.cancelled.push(booking);
          return acc;
        }
        acc[bookingStatusWindow(booking.starts_at)].push(booking);
        return acc;
      },
      { upcoming: [], past: [], cancelled: [] }
    );
  }, demoStore.listBookings);
}

export async function getBooking(reference) {
  return withDataSource(async () => {
    const [rows] = await pool.query(
      `SELECT b.*, e.title AS event_title, e.slug AS event_slug
       FROM bookings b
       INNER JOIN event_types e ON e.id = b.event_type_id
       WHERE b.booking_reference = ?`,
      [reference]
    );
    if (!rows.length) throw httpError(404, "Booking not found.");
    return rows[0];
  }, () => demoStore.getBooking(reference));
}

export async function cancelBooking(reference, reason) {
  return withDataSource(async () => {
    const [result] = await pool.query(
      `UPDATE bookings
       SET status = 'cancelled', cancelled_at = NOW(), cancellation_reason = ?
       WHERE booking_reference = ? AND status = 'scheduled'`,
      [reason || "Cancelled by host", reference]
    );
    if (!result.affectedRows)
      throw httpError(404, "Scheduled booking not found.");
  }, () => demoStore.cancelBooking(reference, reason));
}

export async function getPublicEventPage(slug) {
  return withDataSource(async () => {
    const eventType = await getEventTypeBySlug(slug);
    if (!eventType) throw httpError(404, "Public event page not found.");
    const [questions] = await pool.query(
      "SELECT id, label, field_type, is_required FROM booking_questions WHERE event_type_id = ? ORDER BY sort_order",
      [eventType.id]
    );
    return {
      profile: { name: env.profileName, tagline: env.profileTagline },
      eventType: {
        ...eventType,
        publicLink: buildPublicLink(eventType.slug)
      },
      questions
    };
  }, () => demoStore.getPublicEventPage(slug));
}

export async function getAvailableSlots(slug, date) {
  return withDataSource(async () => {
    const eventType = await getEventTypeBySlug(slug);
    if (!eventType) throw httpError(404, "Public event page not found.");
    const targetDate = toSqlDate(date);
    const weekday = dayjs(targetDate).day();
    const [overrides] = await pool.query(
      "SELECT * FROM availability_overrides WHERE event_type_id = ? AND override_date = ?",
      [eventType.id, targetDate]
    );
    if (overrides.some((item) => item.is_blocked)) {
      return { date: targetDate, slots: [], timezone: eventType.timezone };
    }
    let rules;
    if (overrides.length) {
      rules = overrides
        .filter((item) => !item.is_blocked && item.start_time && item.end_time)
        .map((item) => ({
          start_time: item.start_time,
          end_time: item.end_time,
          timezone: item.timezone
        }));
    } else {
      const [availability] = await pool.query(
        "SELECT * FROM availability_rules WHERE event_type_id = ? AND weekday = ? ORDER BY start_time",
        [eventType.id, weekday]
      );
      rules = availability;
    }
    if (!rules.length)
      return { date: targetDate, slots: [], timezone: eventType.timezone };
    const [bookings] = await pool.query(
      `SELECT starts_at, ends_at
       FROM bookings
       WHERE event_type_id = ? AND status = 'scheduled' AND DATE(starts_at) = ?`,
      [eventType.id, targetDate]
    );
    const busyRanges = bookings.map((booking) => ({
      start: dayjs(booking.starts_at),
      end: dayjs(booking.ends_at)
    }));
    const slots = rules.flatMap((rule) =>
      makeTimeSlots({
        date: targetDate,
        rule,
        durationMinutes: eventType.duration_minutes,
        bufferBefore: eventType.buffer_before,
        bufferAfter: eventType.buffer_after,
        busyRanges
      })
    );
    return { date: targetDate, timezone: eventType.timezone, slots };
  }, () => demoStore.getAvailableSlots(slug, date));
}

export async function createBooking(slug, payload) {
  return withDataSource(async () => {
    const eventType = await getEventTypeBySlug(slug);
    if (!eventType) throw httpError(404, "Public event page not found.");
    const startsAt = dayjs(payload.startsAt);
    const endsAt = startsAt.add(eventType.duration_minutes, "minute");
    const [conflicts] = await pool.query(
      `SELECT id
       FROM bookings
       WHERE event_type_id = ?
         AND status = 'scheduled'
         AND starts_at < ?
         AND ends_at > ?`,
      [
        eventType.id,
        endsAt.format("YYYY-MM-DD HH:mm:ss"),
        startsAt.format("YYYY-MM-DD HH:mm:ss")
      ]
    );
    if (conflicts.length)
      throw httpError(409, "That slot has already been booked.");
    const reference = nanoid(10);
    const [result] = await pool.query(
      `INSERT INTO bookings
        (event_type_id, booking_reference, booker_name, booker_email, answers, starts_at, ends_at, timezone, rescheduled_from_booking_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eventType.id,
        reference,
        payload.name,
        payload.email,
        JSON.stringify(payload.answers || []),
        startsAt.format("YYYY-MM-DD HH:mm:ss"),
        endsAt.format("YYYY-MM-DD HH:mm:ss"),
        payload.timezone || eventType.timezone,
        payload.rescheduledFromBookingId || null
      ]
    );
    const [rows] = await pool.query(
      `SELECT b.*, e.title AS event_title, e.slug AS event_slug
       FROM bookings b
       INNER JOIN event_types e ON e.id = b.event_type_id
       WHERE b.id = ?`,
      [result.insertId]
    );
    return rows[0];
  }, () => demoStore.createBooking(slug, payload));
}

export async function rescheduleBooking(reference, payload) {
  return withDataSource(async () => {
    const [rows] = await pool.query(
      "SELECT * FROM bookings WHERE booking_reference = ?",
      [reference]
    );
    const original = rows[0];
    if (!original || original.status !== "scheduled") {
      throw httpError(404, "Scheduled booking not found.");
    }
    await cancelBooking(reference, "Rescheduled");
    const [eventRows] = await pool.query(
      "SELECT slug FROM event_types WHERE id = ?",
      [original.event_type_id]
    );
    return createBooking(eventRows[0].slug, {
      ...payload,
      rescheduledFromBookingId: original.id
    });
  }, () => demoStore.rescheduleBooking(reference, payload));
}
