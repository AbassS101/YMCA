import { Linking, Platform } from 'react-native';

export interface CalendarExportEvent {
  title: string;
  startIso: string;
  endIso: string;
  location: string;
  description: string;
  instructorName?: string;
}

/**
 * Formats an ISO date string into UTC iCalendar timestamp format: YYYYMMDDTHHMMSSZ
 */
export function toIcsTimestamp(isoString: string): string {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) {
    return '20260914T120000Z';
  }
  return d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Escapes special characters for RFC 5545 iCalendar text fields.
 */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Builds an RFC 5545 compliant .ics calendar file string for a YMCA class or pool session.
 */
export function buildIcsContent(event: CalendarExportEvent): string {
  const dtStart = toIcsTimestamp(event.startIso);
  const dtEnd = toIcsTimestamp(event.endIso);
  const dtStamp = toIcsTimestamp(new Date().toISOString());
  const uid = `ymca-ss-${dtStart}-${event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}@silverspring.ymca`;

  const fullLocation = event.location.includes('YMCA')
    ? event.location
    : `YMCA Silver Spring (${event.location}), 9800 Hastings Dr, Silver Spring, MD 20901`;

  const fullDescription = event.instructorName
    ? `Instructor: ${event.instructorName}\nLocation: ${event.location}\n\n${event.description}`
    : `Location: ${event.location}\n\n${event.description}`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//YMCA Silver Spring//Member App Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(`YMCA: ${event.title}`)}`,
    `LOCATION:${escapeIcsText(fullLocation)}`,
    `DESCRIPTION:${escapeIcsText(fullDescription)}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(`Reminder: ${event.title} starts in 30 minutes at YMCA Silver Spring`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

/**
 * Builds a Google Calendar template URL for 1-click web/mobile calendar addition.
 */
export function buildGoogleCalendarUrl(event: CalendarExportEvent): string {
  const dates = `${toIcsTimestamp(event.startIso)}/${toIcsTimestamp(event.endIso)}`;
  const fullLocation = event.location.includes('YMCA')
    ? event.location
    : `YMCA Silver Spring (${event.location}), 9800 Hastings Dr, Silver Spring, MD 20901`;
  const details = event.instructorName
    ? `Instructor: ${event.instructorName}\nRoom: ${event.location}\n\n${event.description}`
    : `${event.description}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `YMCA: ${event.title}`,
    dates,
    details,
    location: fullLocation,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Downloads an .ics file on Web or opens the calendar data URI on native devices.
 */
export async function downloadOrOpenIcs(event: CalendarExportEvent): Promise<boolean> {
  try {
    const icsContent = buildIcsContent(event);
    const slug = event.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const filename = `ymca-${slug || 'class'}.ics`;

    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      typeof document !== 'undefined' &&
      typeof Blob !== 'undefined'
    ) {
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      return true;
    }

    const dataUri = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
    const supported = await Linking.canOpenURL(dataUri).catch(() => false);
    if (supported) {
      await Linking.openURL(dataUri);
      return true;
    }

    // Fallback to Google Calendar URL on native if data URI is not handled
    const gcalUrl = buildGoogleCalendarUrl(event);
    await Linking.openURL(gcalUrl);
    return true;
  } catch {
    return false;
  }
}

/**
 * Opens Google Calendar in a new browser tab or native browser.
 */
export async function openGoogleCalendar(event: CalendarExportEvent): Promise<boolean> {
  try {
    const gcalUrl = buildGoogleCalendarUrl(event);
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.open === 'function') {
      window.open(gcalUrl, '_blank', 'noopener,noreferrer');
      return true;
    }
    await Linking.openURL(gcalUrl);
    return true;
  } catch {
    return false;
  }
}
