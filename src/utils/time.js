import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);

export function combineDateAndTime(date, time, tz) {
  return dayjs.tz(`${date} ${time}`, "YYYY-MM-DD HH:mm", tz);
}

export function toSqlDate(date) {
  return dayjs(date).format("YYYY-MM-DD");
}

export function bookingStatusWindow(startsAt) {
  return dayjs(startsAt).isBefore(dayjs()) ? "past" : "upcoming";
}

export function makeTimeSlots({
  date,
  rule,
  durationMinutes,
  bufferBefore,
  bufferAfter,
  busyRanges
}) {
  const slots = [];
  let cursor = combineDateAndTime(
    date,
    rule.start_time.slice(0, 5),
    rule.timezone
  );
  const end = combineDateAndTime(
    date,
    rule.end_time.slice(0, 5),
    rule.timezone
  );

  while (cursor.add(durationMinutes, "minute").isSameOrBefore(end)) {
    const start = cursor;
    const finish = cursor.add(durationMinutes, "minute");
    const guardedStart = start.subtract(bufferBefore, "minute");
    const guardedEnd = finish.add(bufferAfter, "minute");
    const isBusy = busyRanges.some((range) => {
      return (
        guardedStart.isBefore(range.end) && guardedEnd.isAfter(range.start)
      );
    });

    if (!isBusy && start.isAfter(dayjs())) {
      slots.push({
        startsAt: start.toISOString(),
        endsAt: finish.toISOString(),
        label: start.format("h:mm A")
      });
    }

    cursor = cursor.add(durationMinutes, "minute");
  }

  return slots;
}
