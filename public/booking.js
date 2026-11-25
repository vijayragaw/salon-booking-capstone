const byId = id => document.getElementById(id);
const bookingFields = byId('booking-fields');
const staffFields = byId('staff-fields');
const service = byId('service');
const date = byId('visit-date');
const time = byId('time');
const name = byId('customer-name');
const genderChoices = Array.from(document.querySelectorAll('input[name="gender"]'));
const phone = byId('phone');
const email = byId('email');
const notes = byId('notes');
const bookingForm = byId('booking-form');
const appointmentNext = byId('appointment-next');
const bookingSteps = [byId('appointment-step'), byId('details-step'), byId('preview-step')];
const progress = Array.from(byId('booking-progress').children);
const summary = byId('booking-summary');
const availability = byId('availability');
const staffDate = byId('schedule-date');
const staffKey = byId('staff-key');
const schedule = byId('schedule');
const notice = byId('notice');
const error = byId('error');
const home = byId('booking-home');
const confirmation = byId('confirmation-page');
const mainNav = byId('main-nav');
const countdown = byId('countdown');
const services = new Map();
let selectedStart = '';
let returnTimer;
let bookingStep = 0;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format();
date.min = date.value = staffDate.value = today;
if (location.pathname === '/thank-you') history.replaceState(null, '', '/');
const staffView = new URLSearchParams(location.search).get('view') === 'staff';
byId('customer-panel').hidden = staffView;
byId('staff-panel').hidden = mainNav.hidden = !staffView;

async function request(path, { method = 'GET', body, key } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (key) headers['X-Staff-Key'] = key;
  const response = await fetch('/api' + path, { method, headers, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'Request failed.');
  return result;
}

async function run(action) {
  bookingFields.disabled = staffFields.disabled = true;
  schedule.querySelectorAll('button').forEach(button => { button.disabled = true; });
  notice.textContent = error.textContent = '';

  try {
    await action();
  } catch (failure) {
    error.textContent = failure.message;
  } finally {
    bookingFields.disabled = staffFields.disabled = false;
    schedule.querySelectorAll('button').forEach(button => { button.disabled = false; });
  }
}

function bookingDetails() {
  return {
    date: date.value, start: selectedStart, serviceId: service.value,
    name: name.value.trim(), gender: genderChoices.find(choice => choice.checked)?.value,
    phone: phone.value, email: email.value.trim(), notes: notes.value.trim(),
  };
}

function formatTime(start) {
  const [hours, minutes] = start.split(':');
  const hour = Number(hours);
  return (hour % 12 || 12) + ':' + minutes + (hour < 12 ? ' AM' : ' PM');
}

function renderPreview() {
  const details = bookingDetails();
  const selected = services.get(details.serviceId);
  const rows = [
    ['Salon', 'Juniper Studio, Indiranagar'],
    ['Service', selected.name + ' · ₹' + selected.price],
    ['Appointment', details.date + ' at ' + formatTime(details.start) + ' IST'],
    ['Name', details.name],
    ['Gender', details.gender],
    ['Mobile', details.phone],
    ['Email', details.email],
    ['Notes', details.notes],
  ];
  summary.replaceChildren();
  for (const [label, value] of rows) {
    if (!value) continue;
    const term = document.createElement('dt');
    term.textContent = label;
    const description = document.createElement('dd');
    description.textContent = value;
    summary.append(term, description);
  }
}

function showStep(index) {
  if (index !== bookingStep) {
    bookingFields.dataset.direction = index > bookingStep ? 'forward' : 'backward';
  }
  bookingStep = index;
  bookingSteps.forEach((step, position) => {
    step.hidden = step.disabled = position !== index;
    if (position === index) progress[position].setAttribute('aria-current', 'step');
    else progress[position].removeAttribute('aria-current');
  });
  if (index === 2) renderPreview();
  const heading = bookingSteps[index].querySelector('h3') ?? byId('booking-title');
  heading.focus();
}

async function refreshSlots() {
  selectedStart = '';
  time.replaceChildren();
  availability.textContent = '';
  appointmentNext.disabled = true;
  if (!date.value) return;
  const slots = await request('/slots?date=' + encodeURIComponent(date.value));
  for (const slot of slots) {
    if (!slot.available) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = formatTime(slot.start);
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      time.querySelector('[aria-pressed="true"]')?.setAttribute('aria-pressed', 'false');
      selectedStart = slot.start;
      button.setAttribute('aria-pressed', 'true');
      appointmentNext.disabled = false;
    });
    time.append(button);
  }
  if (!time.childElementCount) availability.textContent = 'No times are available on this date.';
}

function returnHome() {
  clearInterval(returnTimer);
  confirmation.hidden = true;
  byId('confirmation-notice').textContent = '';
  home.hidden = false;
  if (location.pathname === '/thank-you') history.replaceState(null, '', '/');
  showStep(0);
  void run(refreshSlots);
}

function showConfirmation(booking) {
  const selected = services.get(service.value);
  byId('confirmed-details').textContent = selected.name + ' at Juniper Studio, Indiranagar · ' +
    booking.date + ' at ' + formatTime(booking.start) + ' IST';
  for (const field of [name, phone, email, notes]) field.value = '';
  for (const choice of genderChoices) choice.checked = false;
  home.hidden = true;
  confirmation.hidden = false;
  history.pushState(null, '', '/thank-you');
  byId('confirmation-title').focus();
  byId('confirmation-notice').textContent = 'Appointment confirmed';
  countdown.textContent = '10';
  const deadline = Date.now() + 10000;
  returnTimer = setInterval(() => {
    const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    countdown.textContent = String(seconds);
    if (seconds === 0) returnHome();
  }, 200);
}

byId('return-home').addEventListener('click', returnHome);
window.addEventListener('popstate', () => {
  if (!confirmation.hidden && location.pathname !== '/thank-you') returnHome();
  else if (confirmation.hidden && location.pathname === '/thank-you') history.replaceState(null, '', '/');
});
date.addEventListener('change', () => void run(refreshSlots));
staffDate.addEventListener('change', () => schedule.replaceChildren());
staffKey.addEventListener('input', () => schedule.replaceChildren());

appointmentNext.addEventListener('click', () => {
  if (selectedStart && bookingForm.reportValidity()) showStep(1);
});
byId('details-back').addEventListener('click', () => showStep(0));
byId('details-next').addEventListener('click', () => {
  name.setCustomValidity(name.value.trim() ? '' : 'Enter your name.');
  if (bookingForm.reportValidity()) showStep(2);
});
name.addEventListener('input', () => name.setCustomValidity(''));
byId('preview-back').addEventListener('click', () => showStep(1));

bookingForm.addEventListener('submit', event => {
  event.preventDefault();
  if (bookingStep !== 2 || !selectedStart) return;
  const body = bookingDetails();
  void run(async () => {
    let booking;
    try {
      booking = await request('/bookings', { method: 'POST', body });
    } catch (failure) {
      await refreshSlots().catch(() => {});
      showStep(0);
      throw failure;
    }
    showConfirmation(booking);
  });
});

function renderBooking(booking) {
  const row = document.createElement('li');
  const details = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = formatTime(booking.start) + ' · ' + booking.name + ' · ' +
    (services.get(booking.serviceId)?.name ?? booking.serviceId);
  details.append(title);
  for (const value of [booking.gender, booking.phone, booking.email, booking.notes]) {
    if (!value) continue;
    const line = document.createElement('div');
    line.textContent = value;
    details.append(line);
  }
  const cancel = document.createElement('button');
  cancel.className = 'cancel';
  cancel.type = 'button';
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', () => {
    void run(async () => {
      await request('/bookings/' + booking.id, {
        method: 'DELETE', key: staffKey.value, body: { date: booking.date, start: booking.start },
      });
      row.remove();
      notice.textContent = 'Appointment cancelled.';
      if (!schedule.children.length) renderEmptySchedule();
    });
  });
  row.append(details, cancel);
  schedule.append(row);
}

function renderEmptySchedule() {
  const item = document.createElement('li');
  item.textContent = 'No appointments for this date.';
  schedule.append(item);
}

byId('staff-form').addEventListener('submit', event => {
  event.preventDefault();
  schedule.replaceChildren();
  void run(async () => {
    const bookings = await request('/bookings?date=' + encodeURIComponent(staffDate.value), { key: staffKey.value });
    if (!bookings.length) renderEmptySchedule();
    bookings.forEach(renderBooking);
  });
});

void run(async () => {
  const items = await request('/services');
  for (const item of items) {
    services.set(item.id, item);
    service.add(new Option(item.name + ' · ₹' + item.price, item.id));
  }
  if (!staffView) await refreshSlots();
});
