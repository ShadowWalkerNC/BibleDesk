export const SCHEDULE_KINDS = ['daily', 'weekly', 'monthly', 'one_time'] as const;
export type ScheduleKind = (typeof SCHEDULE_KINDS)[number];

export type PrayerContactInput = {
  displayName: string;
  email: string | null;
  phone: string | null;
  category: 'family' | 'friend' | 'church' | 'missions' | 'healing' | 'work' | 'other';
  isSensitive: boolean;
};

export type PrayerCommitmentInput = {
  contactId: string;
  title: string;
  privateDetails: string | null;
  scheduleKind: ScheduleKind;
  timezone: string;
  localTime: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const CATEGORIES = new Set(['family', 'friend', 'church', 'missions', 'healing', 'work', 'other']);

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Request body must be a JSON object');
  }
  return value as Record<string, unknown>;
}

function cleanString(value: unknown, name: string, max: number, required = false): string | null {
  if (value == null || value === '') {
    if (required) throw new Error(`${name} is required`);
    return null;
  }
  if (typeof value !== 'string') throw new Error(`${name} must be text`);
  const cleaned = value.trim();
  if (required && !cleaned) throw new Error(`${name} is required`);
  if (cleaned.length > max) throw new Error(`${name} is too long`);
  return cleaned || null;
}

export function parseContactInput(value: unknown): PrayerContactInput {
  const body = record(value);
  const displayName = cleanString(body.displayName, 'displayName', 120, true)!;
  const email = cleanString(body.email, 'email', 320);
  const phone = cleanString(body.phone, 'phone', 40);
  const category = typeof body.category === 'string' && CATEGORIES.has(body.category)
    ? body.category as PrayerContactInput['category']
    : 'friend';
  if (email && !EMAIL_PATTERN.test(email)) throw new Error('email is invalid');
  if (body.isSensitive != null && typeof body.isSensitive !== 'boolean') {
    throw new Error('isSensitive must be true or false');
  }
  return { displayName, email, phone, category, isSensitive: body.isSensitive === true };
}

export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

export function parseCommitmentInput(value: unknown): PrayerCommitmentInput {
  const body = record(value);
  const contactId = cleanString(body.contactId, 'contactId', 36, true)!;
  const title = cleanString(body.title, 'title', 160, true)!;
  const privateDetails = cleanString(body.privateDetails, 'privateDetails', 5000);
  const timezone = cleanString(body.timezone, 'timezone', 100, true)!;
  const localTime = cleanString(body.localTime, 'localTime', 5, true)!;
  if (!UUID_PATTERN.test(contactId)) throw new Error('contactId is invalid');
  if (!SCHEDULE_KINDS.includes(body.scheduleKind as ScheduleKind)) {
    throw new Error('scheduleKind is invalid');
  }
  if (!TIME_PATTERN.test(localTime)) throw new Error('localTime must use HH:MM');
  if (!isValidTimezone(timezone)) throw new Error('timezone is invalid');
  return {
    contactId,
    title,
    privateDetails,
    scheduleKind: body.scheduleKind as ScheduleKind,
    timezone,
    localTime,
  };
}

export function requireUuid(value: string, name = 'id'): string {
  if (!UUID_PATTERN.test(value)) throw new Error(`${name} is invalid`);
  return value;
}

type DateParts = { year: number; month: number; day: number; hour: number; minute: number };

function zonedParts(date: Date, timezone: string): DateParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') };
}

function zonedDateTimeToUtc(parts: DateParts, timezone: string): Date {
  const intended = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  let candidate = intended;
  for (let i = 0; i < 3; i += 1) {
    const actual = zonedParts(new Date(candidate), timezone);
    const represented = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute);
    candidate += intended - represented;
  }
  return new Date(candidate);
}

function addLocal(parts: DateParts, kind: ScheduleKind): DateParts {
  const local = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute));
  if (kind === 'monthly') local.setUTCMonth(local.getUTCMonth() + 1);
  else local.setUTCDate(local.getUTCDate() + (kind === 'weekly' ? 7 : 1));
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth() + 1,
    day: local.getUTCDate(),
    hour: local.getUTCHours(),
    minute: local.getUTCMinutes(),
  };
}

export function calculateInitialDueAt(
  scheduleKind: ScheduleKind,
  timezone: string,
  localTime: string,
  now = new Date(),
): Date {
  const current = zonedParts(now, timezone);
  const [hour, minute] = localTime.split(':').map(Number);
  let target: DateParts = { ...current, hour, minute };
  let due = zonedDateTimeToUtc(target, timezone);
  if (due <= now) {
    target = addLocal(target, scheduleKind === 'one_time' ? 'daily' : scheduleKind);
    due = zonedDateTimeToUtc(target, timezone);
  }
  return due;
}

export function calculateNextDueAt(
  scheduleKind: ScheduleKind,
  timezone: string,
  localTime: string,
  previousDueAt: string,
  now = new Date(),
): Date | null {
  if (scheduleKind === 'one_time') return null;
  let parts = zonedParts(new Date(previousDueAt), timezone);
  const [hour, minute] = localTime.split(':').map(Number);
  parts = { ...parts, hour, minute };
  let next = zonedDateTimeToUtc(addLocal(parts, scheduleKind), timezone);
  while (next <= now) {
    parts = zonedParts(next, timezone);
    next = zonedDateTimeToUtc(addLocal({ ...parts, hour, minute }, scheduleKind), timezone);
  }
  return next;
}

function escapeIcs(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function icsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function createCommitmentIcs(commitment: {
  id: string;
  title: string;
  private_details?: string | null;
  next_due_at: string;
  schedule_kind?: ScheduleKind;
  is_sensitive?: boolean;
}): string {
  const start = new Date(commitment.next_due_at);
  const end = new Date(start.getTime() + 15 * 60 * 1000);
  const rrule = commitment.schedule_kind && commitment.schedule_kind !== 'one_time'
    ? `RRULE:FREQ=${commitment.schedule_kind.toUpperCase()}`
    : null;
  const summary = commitment.is_sensitive ? 'Prayer time' : `Prayer: ${commitment.title}`;
  const description = commitment.is_sensitive
    ? 'Private prayer commitment from BibleDesk.'
    : commitment.private_details || 'Time set aside for prayer.';
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BibleDesk//Prayer Care//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:prayer-${commitment.id}@bibledesk`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${escapeIcs(summary)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    ...(rrule ? [rrule] : []),
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

export function createGmailComposeUrl(recipient: string, subject: string, message: string): string {
  const params = new URLSearchParams({ view: 'cm', fs: '1', to: recipient, su: subject, body: message });
  return `https://mail.google.com/mail/?${params.toString()}`;
}
