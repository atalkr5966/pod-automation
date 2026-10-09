import { NextRunCalculation } from '@/types';

/**
 * Standardizes time to HH:MM format (24-hour).
 */
export function normalizeTime(timeStr?: string): string {
  if (!timeStr) return '09:00';
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return '09:00';
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return '09:00';
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Validates whether an IANA timezone string is recognized.
 */
export function isValidTimezone(tz: string): boolean {
  if (!tz) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function sanitizeTimezone(tz?: string): string {
  if (tz && isValidTimezone(tz)) return tz;
  return 'Asia/Kolkata';
}

/**
 * Returns date-time components for a given Date in a specific timezone.
 */
export function getTimezoneParts(date: Date, timeZone: string) {
  const tz = sanitizeTimezone(timeZone);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
    timeZoneName: 'short',
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const hour = parseInt(map.hour || '0', 10);
  const minute = parseInt(map.minute || '0', 10);
  const second = parseInt(map.second || '0', 10);
  const dayOfWeek = dayMap[map.weekday || 'Mon'] ?? 1;

  // YYYY-MM-DD format
  const dateStr = `${map.year}-${map.month}-${map.day}`;
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const tzAbbr = map.timeZoneName || tz;

  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hour,
    minute,
    second,
    dayOfWeek,
    dateStr,
    timeStr,
    tzAbbr,
    timeZone: tz,
  };
}

/**
 * Formats 24h time "09:30" to 12h "09:30 AM"
 */
export function format12Hour(time24: string): string {
  const [hStr, mStr] = normalizeTime(time24).split(':');
  let h = parseInt(hStr, 10);
  const m = mStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

/**
 * Calculates the exact next execution date/time for a scheduled daily task.
 */
export function calculateNextRun(
  scheduledTime: string,
  daysOfWeek: number[],
  timezone: string,
  now: Date = new Date()
): NextRunCalculation | null {
  if (!scheduledTime || !daysOfWeek || daysOfWeek.length === 0) return null;

  const tz = sanitizeTimezone(timezone);
  const normTarget = normalizeTime(scheduledTime);
  const [tHour, tMin] = normTarget.split(':').map((n) => parseInt(n, 10));
  const targetMinutes = tHour * 60 + tMin;

  const currentParts = getTimezoneParts(now, tz);
  const currentMinutes = currentParts.hour * 60 + currentParts.minute;

  // Search forward day by day up to 14 days
  for (let dayOffset = 0; dayOffset <= 14; dayOffset++) {
    // Check candidate day by adding dayOffset to now
    const candidateDate = new Date(now.getTime() + dayOffset * 86400000);
    const candidateParts = getTimezoneParts(candidateDate, tz);

    const isTargetDayActive = daysOfWeek.includes(candidateParts.dayOfWeek);
    if (!isTargetDayActive) continue;

    // If today, make sure scheduled time is strictly in the future (at least 1 minute)
    if (dayOffset === 0 && targetMinutes <= currentMinutes) {
      continue;
    }

    // Construct formatted labels
    const formatted12 = format12Hour(normTarget);
    let dayLabel = `${candidateParts.day} ${getMonthName(candidateParts.month)} ${candidateParts.year}`;
    if (dayOffset === 0) {
      dayLabel = 'Today';
    } else if (dayOffset === 1) {
      dayLabel = 'Tomorrow';
    }

    const label = `${dayLabel} · ${formatted12} ${candidateParts.tzAbbr}`;

    return {
      date: candidateParts.dateStr,
      timeFormatted: `${formatted12} ${candidateParts.tzAbbr}`,
      iso: `${candidateParts.dateStr}T${normTarget}:00`,
      daysRemaining: dayOffset,
      label,
    };
  }

  return null;
}

function getMonthName(monthNumber: number): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  return months[monthNumber - 1] || 'Oct';
}

/**
 * Evaluates whether an automation action is due right now.
 *
 * @param scheduledTime Configured "HH:MM"
 * @param daysOfWeek Array of active days (0..6)
 * @param timezone IANA timezone string
 * @param toleranceMinutes Window for missed-job policy (default 15 minutes)
 * @param now Reference execution Date (default new Date())
 */
export function isActionDue(
  scheduledTime: string,
  daysOfWeek: number[],
  timezone: string,
  toleranceMinutes: number = 15,
  now: Date = new Date()
): {
  isDue: boolean;
  reason?: string;
  targetDateStr: string;
  currentMinutes: number;
  scheduledMinutes: number;
  diffMinutes: number;
} {
  const tz = sanitizeTimezone(timezone);
  const normScheduled = normalizeTime(scheduledTime);
  const [sHour, sMin] = normScheduled.split(':').map((n) => parseInt(n, 10));
  const scheduledMinutes = sHour * 60 + sMin;

  const currentParts = getTimezoneParts(now, tz);
  const currentMinutes = currentParts.hour * 60 + currentParts.minute;

  const targetDateStr = currentParts.dateStr;

  // Day of week check
  if (!daysOfWeek.includes(currentParts.dayOfWeek)) {
    return {
      isDue: false,
      reason: `Day of week (${currentParts.dayOfWeek}) is not configured for execution`,
      targetDateStr,
      currentMinutes,
      scheduledMinutes,
      diffMinutes: currentMinutes - scheduledMinutes,
    };
  }

  // Time difference in minutes
  // diff = currentMinutes - scheduledMinutes
  // If current is 09:32 and scheduled is 09:30, diff = +2 minutes (within tolerance)
  // If current is 09:29, diff = -1 (not yet due)
  const diffMinutes = currentMinutes - scheduledMinutes;

  if (diffMinutes < 0) {
    return {
      isDue: false,
      reason: `Action scheduled in the future (due in ${Math.abs(diffMinutes)} minutes)`,
      targetDateStr,
      currentMinutes,
      scheduledMinutes,
      diffMinutes,
    };
  }

  if (diffMinutes > toleranceMinutes) {
    return {
      isDue: false,
      reason: `Action expired (${diffMinutes} minutes past schedule, exceeds ${toleranceMinutes}m window)`,
      targetDateStr,
      currentMinutes,
      scheduledMinutes,
      diffMinutes,
    };
  }

  return {
    isDue: true,
    targetDateStr,
    currentMinutes,
    scheduledMinutes,
    diffMinutes,
  };
}

/**
 * Builds the atomic idempotency key for an action execution:
 * Format: `exec_<scheduleId>_<targetDate>_<actionType>`
 */
export function buildExecutionKey(
  scheduleId: string,
  targetDate: string,
  actionType: 'OPENING' | 'CLOSING'
): string {
  return `exec_${scheduleId}_${targetDate}_${actionType}`;
}
