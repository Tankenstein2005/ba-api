import * as eventService from "../services/eventService.js";

export async function listEventTypes(_req, res, next) {
  try {
    res.json(await eventService.listEventTypes());
  } catch (error) {
    next(error);
  }
}

export async function getEventType(req, res, next) {
  try {
    res.json(await eventService.getEventTypeDetail(req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function createEventType(req, res, next) {
  try {
    res.status(201).json(await eventService.createEventType(req.body));
  } catch (error) {
    next(error);
  }
}

export async function updateEventType(req, res, next) {
  try {
    res.json(await eventService.updateEventType(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
}

export async function deleteEventType(req, res, next) {
  try {
    await eventService.deleteEventType(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function listBookings(_req, res, next) {
  try {
    res.json(await eventService.listBookings());
  } catch (error) {
    next(error);
  }
}

export async function getBooking(req, res, next) {
  try {
    res.json(await eventService.getBooking(req.params.reference));
  } catch (error) {
    next(error);
  }
}

export async function cancelBooking(req, res, next) {
  try {
    await eventService.cancelBooking(req.params.reference, req.body.reason);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function getPublicEvent(req, res, next) {
  try {
    res.json(await eventService.getPublicEventPage(req.params.slug));
  } catch (error) {
    next(error);
  }
}

export async function getPublicSlots(req, res, next) {
  try {
    res.json(
      await eventService.getAvailableSlots(req.params.slug, req.query.date)
    );
  } catch (error) {
    next(error);
  }
}

export async function createPublicBooking(req, res, next) {
  try {
    res
      .status(201)
      .json(await eventService.createBooking(req.params.slug, req.body));
  } catch (error) {
    next(error);
  }
}

export async function rescheduleBooking(req, res, next) {
  try {
    res
      .status(201)
      .json(
        await eventService.rescheduleBooking(req.params.reference, req.body)
      );
  } catch (error) {
    next(error);
  }
}
