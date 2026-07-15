// src/utils/calendar.js
// Export events to Google Calendar, Outlook Web, or .ics file (universal).

function pad(n) { return String(n).padStart(2, '0'); }

/**
 * Format a Date object for ICS: YYYYMMDDTHHmmssZ (UTC).
 * For "date-only" events, use YYYYMMDD.
 */
function formatICSDateTime(d, dateOnly = false) {
  if (!(d instanceof Date)) d = new Date(d);
  if (dateOnly) {
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
  }
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/**
 * Google Calendar URL format uses: YYYYMMDDTHHmmssZ
 */
function formatGoogleDateTime(d, dateOnly = false) {
  return formatICSDateTime(d, dateOnly);
}

/** Escape text for ICS (RFC 5545). */
function escapeICSText(s) {
  if (!s) return '';
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

/**
 * Normalize event input.
 * @param {object} event - { title, start, end?, description?, location?, uid? }
 *   start/end: Date or ISO string. If end omitted, assumes 1-hour duration or same day for date-only.
 *   For all-day events, pass start as Date at midnight and set allDay: true.
 */
function normalizeEvent(event) {
  const title = event.title || 'Event';
  let start = event.start instanceof Date ? event.start : new Date(event.start);
  let end = event.end ? (event.end instanceof Date ? event.end : new Date(event.end)) : null;
  if (!end) {
    // Default: 1 hour after start
    end = new Date(start.getTime() + 60 * 60 * 1000);
  }
  return {
    title,
    start,
    end,
    description: event.description || '',
    location: event.location || '',
    uid: event.uid || `${Date.now()}-${Math.random().toString(36).slice(2)}@thesis-app`,
    allDay: !!event.allDay,
  };
}

/**
 * Generate .ics file content (RFC 5545).
 */
export function generateICS(rawEvent) {
  const e = normalizeEvent(rawEvent);
  const now = formatICSDateTime(new Date());
  const dtstart = formatICSDateTime(e.start, e.allDay);
  const dtend   = formatICSDateTime(e.end,   e.allDay);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Thesis//Legal Case Management//EL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.uid}`,
    `DTSTAMP:${now}`,
    e.allDay ? `DTSTART;VALUE=DATE:${dtstart}` : `DTSTART:${dtstart}`,
    e.allDay ? `DTEND;VALUE=DATE:${dtend}`     : `DTEND:${dtend}`,
    `SUMMARY:${escapeICSText(e.title)}`,
    e.description ? `DESCRIPTION:${escapeICSText(e.description)}` : null,
    e.location    ? `LOCATION:${escapeICSText(e.location)}`       : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return lines.join('\r\n');
}

/**
 * Trigger .ics download.
 */
export function downloadICS(event, filename) {
  const content = generateICS(event);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'event.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Build a Google Calendar "add event" URL.
 * Opens in browser: user is prompted to save the event.
 */
export function googleCalendarUrl(rawEvent) {
  const e = normalizeEvent(rawEvent);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${formatGoogleDateTime(e.start, e.allDay)}/${formatGoogleDateTime(e.end, e.allDay)}`,
  });
  if (e.description) params.set('details', e.description);
  if (e.location)    params.set('location', e.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Build an Outlook Web "add event" URL.
 */
export function outlookCalendarUrl(rawEvent) {
  const e = normalizeEvent(rawEvent);
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: e.title,
    startdt: e.start.toISOString(),
    enddt:   e.end.toISOString(),
  });
  if (e.description) params.set('body', e.description);
  if (e.location)    params.set('location', e.location);
  return `https://outlook.office.com/calendar/deeplink/compose?${params.toString()}`;
}

/**
 * Helper: build event object from a court action (δικάσιμος).
 */
export function eventFromCourtAction(action) {
  const start = new Date(action.date);
  if (isNaN(start.getTime())) return null;
  // Δικάσιμοι are typically morning — default 09:00 - 12:00 local
  start.setHours(9, 0, 0, 0);
  const end = new Date(start);
  end.setHours(12, 0, 0, 0);

  const parts = [];
  if (action.dikastirio_name) parts.push(`Δικαστήριο: ${action.dikastirio_name}`);
  if (action.diadikasia_name) parts.push(`Διαδικασία: ${action.diadikasia_name}`);
  if (action.pinakio)         parts.push(`Πινάκιο: ${action.pinakio}`);
  if (action.xeirokinito_id)  parts.push(`Πρωτόκολλο: ${action.xeirokinito_id}`);
  if (action.pelatis)         parts.push(`Πελάτης: ${action.pelatis}`);

  return {
    title: action.name || `Δικάσιμος${action.xeirokinito_id ? ' ' + action.xeirokinito_id : ''}`,
    start,
    end,
    description: parts.join('\n'),
    location: action.dikastirio_name || '',
    uid: `court-action-${action.aa}@thesis-app`,
  };
}

/**
 * Helper: build event object from a task action (προθεσμία).
 */
export function eventFromTaskAction(task) {
  const start = new Date(task.date_dead_line);
  if (isNaN(start.getTime())) return null;
  // All-day event for deadlines
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const parts = [];
  if (task.perigrafi_energias) parts.push(task.perigrafi_energias);
  if (task.xeirokinito_id)     parts.push(`Πρωτόκολλο: ${task.xeirokinito_id}`);
  if (task.pelatis)            parts.push(`Πελάτης: ${task.pelatis}`);

  return {
    title: `⏰ ${task.perigrafi_energias || 'Προθεσμία'}${task.xeirokinito_id ? ' — ' + task.xeirokinito_id : ''}`,
    start,
    end,
    description: parts.join('\n'),
    location: '',
    uid: `task-action-${task.aa}@thesis-app`,
    allDay: true,
  };
}

/**
 * Helper: build event from court sub-action.
 */
export function eventFromCourtSubAction(sub, parentAction) {
  const start = new Date(sub.date);
  if (isNaN(start.getTime())) return null;
  start.setHours(9, 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const title = sub.energeia_name || sub.perigrafi || 'Ενέργεια δικασίμου';
  const parts = [];
  if (sub.perigrafi && sub.perigrafi !== sub.energeia_name) parts.push(sub.perigrafi);
  if (parentAction?.dikastirio_name) parts.push(`Δικαστήριο: ${parentAction.dikastirio_name}`);
  if (parentAction?.xeirokinito_id)  parts.push(`Πρωτόκολλο: ${parentAction.xeirokinito_id}`);

  return {
    title: `📋 ${title}`,
    start,
    end,
    description: parts.join('\n'),
    location: parentAction?.dikastirio_name || '',
    uid: `court-sub-action-${sub.aa}@thesis-app`,
  };
}
