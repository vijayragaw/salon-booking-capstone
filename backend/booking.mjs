import { randomUUID, timingSafeEqual } from 'node:crypto';

export const services = [
  { id: 'haircut', name: 'Signature haircut', price: 499 },
  { id: 'blowout', name: 'Wash & blow-dry', price: 399 },
  { id: 'beard', name: 'Beard trim', price: 249 },
];

const duration = 30;
const interval = 15;
const opening = 10 * 60;
const closing = 18 * 60;
const openingHours = Array.from({ length: (closing - opening - duration) / interval + 1 }, (_, index) => {
  const minutes = opening + index * interval;
  return String(Math.floor(minutes / 60)) + ':' + String(minutes % 60).padStart(2, '0');
});
const genders = new Set(['Woman', 'Man', 'Non-binary', 'Prefer not to say']);

function overlaps(first, second) {
  return Math.abs(openingHours.indexOf(first) - openingHours.indexOf(second)) * interval < duration;
}

function futureSlot(date, start, now) {
  return Date.parse(date + 'T' + start + ':00+05:30') > now.getTime();
}

function validDay(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const day = new Date(date);
  return Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === date;
}

function authorized(key, expected) {
  if (!expected || typeof key !== 'string') return false;
  const supplied = Buffer.from(key);
  const secret = Buffer.from(expected);
  return supplied.length === secret.length && timingSafeEqual(supplied, secret);
}

export function memoryStore() {
  const bookings = new Map();
  const keyFor = (date, start) => date + '/' + start;
  return {
    async list(date) {
      return [...bookings.values()].filter(booking => booking.date === date);
    },
    async book(booking) {
      const key = keyFor(booking.date, booking.start);
      for (const existing of bookings.values()) {
        if (existing.date === booking.date && overlaps(existing.start, booking.start)) return false;
      }
      bookings.set(key, booking);
      return true;
    },
    async cancel(date, start, id) {
      const key = keyFor(date, start);
      if (bookings.get(key)?.id !== id) return false;
      return bookings.delete(key);
    },
  };
}

export function createApi(store, staffKey, clock = () => new Date()) {
  return async function handler(event) {
    const method = event.requestContext.http.method;
    const path = event.rawPath;
    const date = event.queryStringParameters?.date;
    const respond = (statusCode, value) => ({
      statusCode,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      body: JSON.stringify(value),
    });

    if (method === 'GET' && path === '/api/services') return respond(200, services);

    const staffRoute = (method === 'GET' && path === '/api/bookings') ||
      (method === 'DELETE' && path.startsWith('/api/bookings/'));
    if (staffRoute && !authorized(event.headers?.['x-staff-key'], staffKey)) {
      return respond(401, { error: 'Enter a valid staff access key.' });
    }

    if (method === 'GET' && (staffRoute || path === '/api/slots')) {
      if (!validDay(date)) return respond(400, { error: 'Select a valid date.' });
      const bookings = await store.list(date);
      if (staffRoute) return respond(200, bookings.sort((a, b) => a.start.localeCompare(b.start)));
      const now = clock();
      return respond(200, openingHours.map(start => ({
        start, available: futureSlot(date, start, now) && !bookings.some(booking => overlaps(booking.start, start)),
      })));
    }

    if ((method === 'POST' && path === '/api/bookings') || staffRoute) {
      let body;
      try {
        body = JSON.parse(event.body ?? '');
      } catch {
        return respond(400, { error: 'Invalid request.' });
      }
      if (!validDay(body?.date) || !openingHours.includes(body.start)) {
        return respond(400, { error: 'Select a valid appointment slot.' });
      }
      if (staffRoute) {
        const removed = await store.cancel(body.date, body.start, path.slice('/api/bookings/'.length));
        return removed ? respond(200, { cancelled: true }) : respond(404, { error: 'Appointment no longer exists.' });
      }
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name || name.length > 80 || !services.some(service => service.id === body.serviceId)) {
        return respond(400, { error: 'Enter your name and select a service.' });
      }
      if (!genders.has(body.gender)) return respond(400, { error: 'Select a gender option.' });
      const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
      if (!/^[0-9]{10}$/.test(phone)) {
        return respond(400, { error: 'Enter a 10-digit mobile number.' });
      }
      const email = typeof body.email === 'string' ? body.email.trim() : '';
      if ((body.email != null && typeof body.email !== 'string') ||
          email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
        return respond(400, { error: 'Enter a valid email address.' });
      }
      const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
      if ((body.notes != null && typeof body.notes !== 'string') || notes.length > 500) {
        return respond(400, { error: 'Keep appointment notes to 500 characters or fewer.' });
      }
      if (!futureSlot(body.date, body.start, clock())) {
        return respond(409, { error: 'That appointment time has passed.' });
      }
      const booking = {
        id: randomUUID(), date: body.date, start: body.start, serviceId: body.serviceId,
        name, gender: body.gender, phone, email, notes,
      };
      return await store.book(booking)
        ? respond(201, { id: booking.id, date: booking.date, start: booking.start })
        : respond(409, { error: 'That time is no longer available. Please select another time.' });
    }
    return respond(404, { error: 'Page not found.' });
  };
}
