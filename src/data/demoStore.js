import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { nanoid } from "nanoid";
import { env } from "../config/env.js";
import { httpError } from "../utils/httpError.js";
import {
  bookingStatusWindow,
  makeTimeSlots,
  toSqlDate
} from "../utils/time.js";

dayjs.extend(utc);
dayjs.extend(timezone);

function buildPublicLink(slug) {
  if (env.publicClientUrl) {
    return `${env.publicClientUrl}/book/${slug}`;
  }

  return `/book/${slug}`;
}

function createInitialState() {
  const tomorrow = dayjs().add(1, "day");

  return {
    counters: {
      eventType: 2,
      availability: 6,
      override: 2,
      question: 3,
      booking: 2
    },
    eventTypes: [
      {
        id: 1,
        title: "Intro Strategy Call",
        description:
          "A lightweight planning session for timelines, scope, and next steps.",
        duration_minutes: 30,
        slug: "intro-strategy-call",
        is_hidden: 0,
        buffer_before: 10,
        buffer_after: 10,
        color: "#f97316",
        location_label: "Google Meet",
        timezone: env.defaultTimezone,
        created_at: dayjs().subtract(14, "day").toISOString()
      }
    ],
    availabilityRules: [
      {
        id: 1,
        event_type_id: 1,
        schedule_name: "Weekdays",
        weekday: 1,
        start_time: "09:00:00",
        end_time: "17:00:00",
        timezone: env.defaultTimezone
      },
      {
        id: 2,
        event_type_id: 1,
        schedule_name: "Weekdays",
        weekday: 2,
        start_time: "09:00:00",
        end_time: "17:00:00",
        timezone: env.defaultTimezone
      },
      {
        id: 3,
        event_type_id: 1,
        schedule_name: "Weekdays",
        weekday: 3,
        start_time: "09:00:00",
        end_time: "17:00:00",
        timezone: env.defaultTimezone
      },
      {
        id: 4,
        event_type_id: 1,
        schedule_name: "Weekdays",
        weekday: 4,
        start_time: "09:00:00",
        end_time: "17:00:00",
        timezone: env.defaultTimezone
      },
      {
        id: 5,
        event_type_id: 1,
        schedule_name: "Weekdays",
        weekday: 5,
        start_time: "09:00:00",
        end_time: "17:00:00",
        timezone: env.defaultTimezone
      }
    ],
    overrides: [
      {
        id: 1,
        event_type_id: 1,
        override_date: tomorrow.add(2, "day").format("YYYY-MM-DD"),
        is_blocked: 1,
        start_time: null,
        end_time: null,
        timezone: env.defaultTimezone,
        note: "Reserved for internal work"
      }
    ],
    questions: [
      {
        id: 1,
        event_type_id: 1,
        label: "What should we focus on?",
        field_type: "text",
        is_required: 0,
        sort_order: 0
      },
      {
        id: 2,
        event_type_id: 1,
        label: "Anything I should review before we meet?",
        field_type: "textarea",
        is_required: 0,
        sort_order: 1
      }
    ],
    bookings: [
      {
        id: 1,
        event_type_id: 1,
        booking_reference: "demointro1",
        booker_name: "Alex Carter",
        booker_email: "alex@example.com",
        answers: JSON.stringify([]),
        starts_at: tomorrow.hour(11).minute(0).second(0).millisecond(0).toISOString(),
        ends_at: tomorrow.hour(11).minute(30).second(0).millisecond(0).toISOString(),
        timezone: env.defaultTimezone,
        status: "scheduled",
        cancelled_at: null,
        cancellation_reason: null,
        rescheduled_from_booking_id: null
      }
    ]
  };
}

const state = globalThis.__brokenArrowDemoStore ?? createInitialState();
globalThis.__brokenArrowDemoStore = state;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nextId(key) {
  const value = state.counters[key];
  state.counters[key] += 1;
  return value;
}

function sortByCreatedDesc(left, right) {
  return dayjs(right.created_at).valueOf() - dayjs(left.created_at).valueOf();
}

function getEventTypeRecord(id) {
  return state.eventTypes.find((item) => String(item.id) === String(id));
}

function getPublicEventTypeRecord(slug) {
  return state.eventTypes.find(
    (item) => item.slug === slug && !item.is_hidden
  );
}

function getRelatedAvailability(eventTypeId) {
  return state.availabilityRules
    .filter((item) => item.event_type_id === Number(eventTypeId))
    .sort((left, right) => {
      if (left.weekday !== right.weekday) {
        return left.weekday - right.weekday;
      }

      return left.start_time.localeCompare(right.start_time);
    });
}

function getRelatedOverrides(eventTypeId) {
  return state.overrides
    .filter((item) => item.event_type_id === Number(eventTypeId))
    .sort((left, right) => left.override_date.localeCompare(right.override_date));
}

function getRelatedQuestions(eventTypeId) {
  return state.questions
    .filter((item) => item.event_type_id === Number(eventTypeId))
    .sort((left, right) => left.sort_order - right.sort_order);
}

function countScheduledBookings(eventTypeId) {
  return state.bookings.filter((booking) => {
    return (
      booking.event_type_id === Number(eventTypeId) &&
      booking.status === "scheduled"
    );
  }).length;
}

function serializeEventType(eventType) {
  return {
    ...eventType,
    bookings_count: countScheduledBookings(eventType.id),
    publicLink: buildPublicLink(eventType.slug)
  };
}

function serializeBooking(booking) {
  const eventType = getEventTypeRecord(booking.event_type_id);

  return {
    ...booking,
    event_title: eventType?.title || "Deleted event",
    event_slug: eventType?.slug || null
  };
}

function ensureUniqueSlug(slug, ignoredId = null) {
  const existing = state.eventTypes.find((item) => {
    return item.slug === slug && String(item.id) !== String(ignoredId);
  });

  if (existing) {
    throw httpError(409, "Slug already exists.");
  }
}

function replaceAvailability(eventTypeId, availability = []) {
  state.availabilityRules = state.availabilityRules.filter((item) => {
    return item.event_type_id !== Number(eventTypeId);
  });

  availability.forEach((rule) => {
    state.availabilityRules.push({
      id: nextId("availability"),
      event_type_id: Number(eventTypeId),
      schedule_name: rule.scheduleName || "Default schedule",
      weekday: Number(rule.weekday),
      start_time: `${rule.startTime}:00`,
      end_time: `${rule.endTime}:00`,
      timezone: rule.timezone || env.defaultTimezone
    });
  });
}

function replaceOverrides(eventTypeId, overrides = []) {
  state.overrides = state.overrides.filter((item) => {
    return item.event_type_id !== Number(eventTypeId);
  });

  overrides.forEach((override) => {
    state.overrides.push({
      id: nextId("override"),
      event_type_id: Number(eventTypeId),
      override_date: override.overrideDate,
      is_blocked: override.isBlocked ? 1 : 0,
      start_time: override.isBlocked || !override.startTime ? null : `${override.startTime}:00`,
      end_time: override.isBlocked || !override.endTime ? null : `${override.endTime}:00`,
      timezone: override.timezone || env.defaultTimezone,
      note: override.note || null
    });
  });
}

function replaceQuestions(eventTypeId, questions = []) {
  state.questions = state.questions.filter((item) => {
    return item.event_type_id !== Number(eventTypeId);
  });

  questions.forEach((question, index) => {
    state.questions.push({
      id: nextId("question"),
      event_type_id: Number(eventTypeId),
      label: question.label,
      field_type: question.fieldType || "text",
      is_required: question.isRequired ? 1 : 0,
      sort_order: index
    });
  });
}

export async function listEventTypes() {
  return clone(
    state.eventTypes
      .slice()
      .sort(sortByCreatedDesc)
      .map(serializeEventType)
  );
}

export async function getEventTypeDetail(id) {
  const eventType = getEventTypeRecord(id);

  if (!eventType) {
    throw httpError(404, "Event type not found.");
  }

  return clone({
    ...serializeEventType(eventType),
    availability: getRelatedAvailability(id),
    overrides: getRelatedOverrides(id),
    questions: getRelatedQuestions(id)
  });
}

export async function createEventType(payload) {
  ensureUniqueSlug(payload.slug);

  const eventTypeId = nextId("eventType");
  state.eventTypes.push({
    id: eventTypeId,
    title: payload.title,
    description: payload.description,
    duration_minutes: payload.durationMinutes,
    slug: payload.slug,
    is_hidden: payload.isHidden ? 1 : 0,
    buffer_before: payload.bufferBefore || 0,
    buffer_after: payload.bufferAfter || 0,
    color: payload.color || "#f97316",
    location_label: payload.locationLabel || "Google Meet",
    timezone: payload.timezone || env.defaultTimezone,
    created_at: new Date().toISOString()
  });

  replaceAvailability(eventTypeId, payload.availability);
  replaceOverrides(eventTypeId, payload.overrides);
  replaceQuestions(eventTypeId, payload.questions);

  return getEventTypeDetail(eventTypeId);
}

export async function updateEventType(id, payload) {
  const eventType = getEventTypeRecord(id);

  if (!eventType) {
    throw httpError(404, "Event type not found.");
  }

  ensureUniqueSlug(payload.slug, id);

  Object.assign(eventType, {
    title: payload.title,
    description: payload.description,
    duration_minutes: payload.durationMinutes,
    slug: payload.slug,
    is_hidden: payload.isHidden ? 1 : 0,
    buffer_before: payload.bufferBefore || 0,
    buffer_after: payload.bufferAfter || 0,
    color: payload.color || "#f97316",
    location_label: payload.locationLabel || "Google Meet",
    timezone: payload.timezone || env.defaultTimezone
  });

  replaceAvailability(id, payload.availability);
  replaceOverrides(id, payload.overrides);
  replaceQuestions(id, payload.questions);

  return getEventTypeDetail(id);
}

export async function deleteEventType(id) {
  const numericId = Number(id);
  const initialLength = state.eventTypes.length;

  state.eventTypes = state.eventTypes.filter((item) => item.id !== numericId);
  state.availabilityRules = state.availabilityRules.filter((item) => {
    return item.event_type_id !== numericId;
  });
  state.overrides = state.overrides.filter((item) => item.event_type_id !== numericId);
  state.questions = state.questions.filter((item) => item.event_type_id !== numericId);
  state.bookings = state.bookings.filter((item) => item.event_type_id !== numericId);

  if (state.eventTypes.length === initialLength) {
    throw httpError(404, "Event type not found.");
  }
}

export async function listBookings() {
  const rows = state.bookings
    .slice()
    .sort((left, right) => left.starts_at.localeCompare(right.starts_at))
    .map(serializeBooking);

  return clone(
    rows.reduce(
      (acc, booking) => {
        if (booking.status !== "scheduled") {
          acc.cancelled.push(booking);
          return acc;
        }

        acc[bookingStatusWindow(booking.starts_at)].push(booking);
        return acc;
      },
      { upcoming: [], past: [], cancelled: [] }
    )
  );
}

export async function getBooking(reference) {
  const booking = state.bookings.find((item) => item.booking_reference === reference);

  if (!booking) {
    throw httpError(404, "Booking not found.");
  }

  return clone(serializeBooking(booking));
}

export async function cancelBooking(reference, reason) {
  const booking = state.bookings.find((item) => {
    return item.booking_reference === reference && item.status === "scheduled";
  });

  if (!booking) {
    throw httpError(404, "Scheduled booking not found.");
  }

  booking.status = "cancelled";
  booking.cancelled_at = new Date().toISOString();
  booking.cancellation_reason = reason || "Cancelled by host";
}

export async function getPublicEventPage(slug) {
  const eventType = getPublicEventTypeRecord(slug);

  if (!eventType) {
    throw httpError(404, "Public event page not found.");
  }

  return clone({
    profile: { name: env.profileName, tagline: env.profileTagline },
    eventType: serializeEventType(eventType),
    questions: getRelatedQuestions(eventType.id).map((question) => ({
      id: question.id,
      label: question.label,
      field_type: question.field_type,
      is_required: question.is_required
    }))
  });
}

export async function getAvailableSlots(slug, date) {
  const eventType = getPublicEventTypeRecord(slug);

  if (!eventType) {
    throw httpError(404, "Public event page not found.");
  }

  const targetDate = toSqlDate(date);
  const weekday = dayjs(targetDate).day();
  const overrides = getRelatedOverrides(eventType.id).filter((item) => {
    return item.override_date === targetDate;
  });

  if (overrides.some((item) => item.is_blocked)) {
    return clone({ date: targetDate, slots: [], timezone: eventType.timezone });
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
    rules = getRelatedAvailability(eventType.id).filter((item) => {
      return item.weekday === weekday;
    });
  }

  if (!rules.length) {
    return clone({ date: targetDate, slots: [], timezone: eventType.timezone });
  }

  const busyRanges = state.bookings
    .filter((booking) => {
      return (
        booking.event_type_id === eventType.id &&
        booking.status === "scheduled" &&
        toSqlDate(booking.starts_at) === targetDate
      );
    })
    .map((booking) => ({
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

  return clone({ date: targetDate, timezone: eventType.timezone, slots });
}

export async function createBooking(slug, payload) {
  const eventType = getPublicEventTypeRecord(slug);

  if (!eventType) {
    throw httpError(404, "Public event page not found.");
  }

  const startsAt = dayjs(payload.startsAt);
  const endsAt = startsAt.add(eventType.duration_minutes, "minute");
  const hasConflict = state.bookings.some((booking) => {
    return (
      booking.event_type_id === eventType.id &&
      booking.status === "scheduled" &&
      dayjs(booking.starts_at).isBefore(endsAt) &&
      dayjs(booking.ends_at).isAfter(startsAt)
    );
  });

  if (hasConflict) {
    throw httpError(409, "That slot has already been booked.");
  }

  const booking = {
    id: nextId("booking"),
    event_type_id: eventType.id,
    booking_reference: nanoid(10),
    booker_name: payload.name,
    booker_email: payload.email,
    answers: JSON.stringify(payload.answers || []),
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    timezone: payload.timezone || eventType.timezone,
    status: "scheduled",
    cancelled_at: null,
    cancellation_reason: null,
    rescheduled_from_booking_id: payload.rescheduledFromBookingId || null
  };

  state.bookings.push(booking);

  return clone(serializeBooking(booking));
}

export async function rescheduleBooking(reference, payload) {
  const booking = state.bookings.find((item) => item.booking_reference === reference);

  if (!booking || booking.status !== "scheduled") {
    throw httpError(404, "Scheduled booking not found.");
  }

  const eventType = getEventTypeRecord(booking.event_type_id);

  await cancelBooking(reference, "Rescheduled");

  return createBooking(eventType.slug, {
    ...payload,
    rescheduledFromBookingId: booking.id
  });
}
