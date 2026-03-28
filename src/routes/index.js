import { Router } from "express";
import {
  cancelBooking,
  createEventType,
  getBooking,
  createPublicBooking,
  deleteEventType,
  getEventType,
  getPublicEvent,
  getPublicSlots,
  listBookings,
  listEventTypes,
  rescheduleBooking,
  updateEventType
} from "../controllers/eventController.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.get("/event-types", listEventTypes);
router.get("/event-types/:id", getEventType);
router.post("/event-types", createEventType);
router.put("/event-types/:id", updateEventType);
router.delete("/event-types/:id", deleteEventType);

router.get("/bookings", listBookings);
router.get("/bookings/:reference", getBooking);
router.post("/bookings/:reference/cancel", cancelBooking);
router.post("/bookings/:reference/reschedule", rescheduleBooking);

router.get("/public/:slug", getPublicEvent);
router.get("/public/:slug/slots", getPublicSlots);
router.post("/public/:slug/book", createPublicBooking);

export default router;
