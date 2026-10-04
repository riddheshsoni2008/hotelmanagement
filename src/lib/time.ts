import { addHours, addDays, format, formatDistanceToNow, isAfter, isBefore, differenceInMinutes, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export const TIMEZONE_IST = 'Asia/Kolkata';

/**
 * Format any UTC date or ISO string to IST formatted string:
 * e.g. "04 Oct 2026, 02:30 PM"
 */
export function formatToIST(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : new Date(dateInput);
  if (isNaN(date.getTime())) return '-';
  
  const zonedDate = toZonedTime(date, TIMEZONE_IST);
  return format(zonedDate, 'dd MMM yyyy, hh:mm a');
}

/**
 * Format date part only in IST:
 * e.g. "04 Oct 2026"
 */
export function formatDateIST(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : new Date(dateInput);
  if (isNaN(date.getTime())) return '-';
  
  const zonedDate = toZonedTime(date, TIMEZONE_IST);
  return format(zonedDate, 'dd MMM yyyy');
}

/**
 * Format time part only in IST:
 * e.g. "02:30 PM"
 */
export function formatTimeIST(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : new Date(dateInput);
  if (isNaN(date.getTime())) return '-';
  
  const zonedDate = toZonedTime(date, TIMEZONE_IST);
  return format(zonedDate, 'hh:mm a');
}

/**
 * Calculate expected check-out time given checkInAt and duration
 */
export function calculateExpectedCheckOut(
  checkInAt: Date | string,
  durationValue: number,
  durationUnit: 'hours' | 'days'
): Date {
  const baseDate = typeof checkInAt === 'string' ? new Date(checkInAt) : checkInAt;
  if (isNaN(baseDate.getTime())) {
    return new Date();
  }

  const val = Number(durationValue) || 1;
  if (durationUnit === 'days') {
    return addDays(baseDate, val);
  }
  return addHours(baseDate, val);
}

/**
 * Helper to compute countdown and overstay information
 */
export interface StayCountdownInfo {
  isOverstay: boolean;
  text: string;
  diffMinutes: number;
  statusBadge: 'checked_in' | 'overstay' | 'checked_out';
}

export function getStayStatusAndCountdown(
  status: 'checked_in' | 'checked_out',
  expectedCheckOutAt: Date | string,
  actualCheckOutAt?: Date | string | null
): StayCountdownInfo {
  if (status === 'checked_out') {
    return {
      isOverstay: false,
      text: actualCheckOutAt ? `Checked out at ${formatTimeIST(actualCheckOutAt)}` : 'Checked out',
      diffMinutes: 0,
      statusBadge: 'checked_out',
    };
  }

  const now = new Date();
  const expected = typeof expectedCheckOutAt === 'string' ? new Date(expectedCheckOutAt) : expectedCheckOutAt;
  const isOverstay = isAfter(now, expected);
  const diffMin = Math.abs(differenceInMinutes(now, expected));

  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  let timeStr = '';
  if (hours > 0) {
    timeStr = `${hours}h ${mins}m`;
  } else {
    timeStr = `${mins}m`;
  }

  if (isOverstay) {
    return {
      isOverstay: true,
      text: `Overstay by ${timeStr}`,
      diffMinutes: diffMin,
      statusBadge: 'overstay',
    };
  } else {
    return {
      isOverstay: false,
      text: `${timeStr} left`,
      diffMinutes: -diffMin,
      statusBadge: 'checked_in',
    };
  }
}

/**
 * Format ISO string for HTML input datetime-local in IST
 */
export function getLocalISTDateTimeInputValue(date: Date = new Date()): string {
  const zoned = toZonedTime(date, TIMEZONE_IST);
  return format(zoned, "yyyy-MM-dd'T'HH:mm");
}
