import { NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/storage';
import { generateOpeningPod, generateClosingPod } from '@/lib/analyzer';
import { dispatchPodMessage } from '@/lib/dispatcher';

// In-memory record to prevent firing multiple times within the same scheduled minute
const firedRecords = new Set<string>();

// Periodic cleanup of older records
setInterval(() => {
  if (firedRecords.size > 200) {
    firedRecords.clear();
  }
}, 3600000); // clear every hour

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isForce = searchParams.get('force') === 'true';
    const targetType = searchParams.get('type') as 'OPENING' | 'CLOSING' | null;

    const users = getAllUsers();
    const triggered: any[] = [];
    const scheduleStatus: any[] = [];

    const nowUtc = new Date();

    for (const user of users) {
      const tz = user.schedule?.timezone || 'Asia/Kolkata';

      // Format current time in user's timezone as HH:MM
      const userTimeStr = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(nowUtc);

      // Current date string in user's timezone as YYYY-MM-DD
      const userDateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(nowUtc);

      // Get user's day of week (0 = Sun, 1 = Mon ... 6 = Sat)
      const userDayStr = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        weekday: 'short',
      }).format(nowUtc);

      const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      const currentDay = dayMap[userDayStr] ?? nowUtc.getDay();

      const opening = user.schedule?.opening;
      const closing = user.schedule?.closing;

      scheduleStatus.push({
        user: user.username,
        currentTime: userTimeStr,
        currentDay: userDayStr,
        opening: {
          enabled: opening?.enabled,
          scheduledTime: opening?.time,
          isMatch: opening?.time === userTimeStr,
          dayActive: opening?.days?.includes(currentDay),
        },
        closing: {
          enabled: closing?.enabled,
          scheduledTime: closing?.time,
          isMatch: closing?.time === userTimeStr,
          dayActive: closing?.days?.includes(currentDay),
        },
      });

      // 1. Check Opening Schedule
      const shouldTriggerOpening =
        isForce && targetType === 'OPENING'
          ? true
          : opening?.enabled &&
            opening.days?.includes(currentDay) &&
            opening.time === userTimeStr;

      const openingKey = `${user.id}_OPENING_${userDateStr}_${userTimeStr}`;

      if (shouldTriggerOpening && (!firedRecords.has(openingKey) || isForce)) {
        if (!isForce) firedRecords.add(openingKey);
        console.log(`[Cron] 🌅 Triggering Opening POD for ${user.username} at ${userTimeStr} (${tz})`);

        const content = generateOpeningPod(user);
        const results = await dispatchPodMessage({
          user,
          type: 'OPENING',
          content,
        });

        triggered.push({
          user: user.username,
          type: 'OPENING',
          time: userTimeStr,
          results,
        });
      }

      // 2. Check Closing Schedule
      const shouldTriggerClosing =
        isForce && targetType === 'CLOSING'
          ? true
          : closing?.enabled &&
            closing.days?.includes(currentDay) &&
            closing.time === userTimeStr;

      const closingKey = `${user.id}_CLOSING_${userDateStr}_${userTimeStr}`;

      if (shouldTriggerClosing && (!firedRecords.has(closingKey) || isForce)) {
        if (!isForce) firedRecords.add(closingKey);
        console.log(`[Cron] 🌆 Triggering Closing POD for ${user.username} at ${userTimeStr} (${tz})`);

        const content = generateClosingPod(user);
        const results = await dispatchPodMessage({
          user,
          type: 'CLOSING',
          content,
        });

        triggered.push({
          user: user.username,
          type: 'CLOSING',
          time: userTimeStr,
          results,
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      activeUsersChecked: users.length,
      triggered,
      scheduleStatus,
    });
  } catch (err: any) {
    console.error('Cron Trigger Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
