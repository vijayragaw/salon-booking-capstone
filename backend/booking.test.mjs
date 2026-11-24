import assert from 'node:assert/strict';
import test from 'node:test';
import { createApi, memoryStore } from './booking.mjs';

const date = '2030-06-15';
const appointment = {
  date, start: '10:00', serviceId: 'haircut', name: 'Sam',
  gender: 'Prefer not to say', phone: '9000000000', email: 'sam@example.com', notes: 'Keep the length.',
};

function setup() {
  const api = createApi(memoryStore(), 'test-key', () => new Date('2030-06-14T00:00:00Z'));
  return (method, path, body, staffKey) => api({
    requestContext: { http: { method } },
    rawPath: '/api' + path,
    queryStringParameters: { date },
    headers: { 'x-staff-key': staffKey },
    body: JSON.stringify(body),
  });
}

test('concurrent requests can book a slot only once', async () => {
  const call = setup();
  const results = await Promise.all([
    call('POST', '/bookings', appointment),
    call('POST', '/bookings', { ...appointment, name: 'Taylor' }),
  ]);
  assert.deepEqual(results.map(result => result.statusCode).sort(), [201, 409]);
  const slots = await call('GET', '/slots');
  const availability = JSON.parse(slots.body);
  assert.deepEqual(availability.slice(0, 3), [
    { start: '10:00', available: false },
    { start: '10:15', available: false },
    { start: '10:30', available: true },
  ]);
  assert.equal(availability.at(-1).start, '17:30');
  assert.equal((await call('POST', '/bookings', { ...appointment, start: '10:15' })).statusCode, 409);
});

test('staff access is required and cancellation reopens the slot', async () => {
  const call = setup();
  const result = await call('POST', '/bookings', appointment);
  const booking = JSON.parse(result.body);
  assert.equal((await call('GET', '/bookings')).statusCode, 401);
  const listed = await call('GET', '/bookings', undefined, 'test-key');
  assert.deepEqual(JSON.parse(listed.body)[0], { ...appointment, id: booking.id });
  assert.equal(booking.phone, undefined);
  assert.equal(booking.notes, undefined);
  const path = '/bookings/' + booking.id;
  assert.equal((await call('DELETE', path, appointment)).statusCode, 401);
  assert.equal((await call('DELETE', path, appointment, 'test-key')).statusCode, 200);
  assert.equal((await call('POST', '/bookings', appointment)).statusCode, 201);
  assert.equal((await call('DELETE', path, appointment, 'test-key')).statusCode, 404);
});

test('customer fields are validated and email and notes can be omitted', async () => {
  const call = setup();
  for (const fields of [
    { gender: '' },
    { phone: '12345' },
    { email: 'invalid@email' },
    { notes: 'x'.repeat(501) },
  ]) {
    assert.equal((await call('POST', '/bookings', { ...appointment, ...fields })).statusCode, 400);
  }
  assert.equal((await call('POST', '/bookings', { ...appointment, email: undefined, notes: undefined })).statusCode, 201);
});

test('invalid dates, unknown services and past slots are rejected', async () => {
  const call = setup();
  assert.equal((await call('POST', '/bookings', { ...appointment, date: '2030-02-30' })).statusCode, 400);
  assert.equal((await call('POST', '/bookings', { ...appointment, serviceId: 'fake' })).statusCode, 400);
  assert.equal((await call('POST', '/bookings', { ...appointment, date: '2030-06-13' })).statusCode, 409);
});
