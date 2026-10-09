import { NextResponse } from 'next/server';
import { dbService } from '@/server/db';
import { getSessionUser } from '@/server/auth';
import { calculateNextRun, sanitizeTimezone, normalizeTime } from '@/lib/timezone';
import { ScheduleLivePreview } from '@/types';

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const schedules = await dbService.listSchedules(user.workspaceId);
    const now = new Date();

    const previews: ScheduleLivePreview[] = schedules.map((s) => ({
      scheduleId: s.id,
      scheduleName: s.name,
      timezone: s.timezone,
      channel: s.channelId,
      active: s.active,
      opening: {
        enabled: s.openingEnabled,
        configuredTime: s.openingTime,
        nextRun: s.openingEnabled ? calculateNextRun(s.openingTime, s.daysOfWeek, s.timezone, now) : null,
      },
      closing: {
        enabled: s.closingEnabled,
        configuredTime: s.closingTime,
        nextRun: s.closingEnabled ? calculateNextRun(s.closingTime, s.daysOfWeek, s.timezone, now) : null,
      },
    }));

    return NextResponse.json({
      schedules,
      previews,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Automations GET Error:', msg);
    return NextResponse.json({ error: 'Failed to fetch automation schedules', details: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      timezone = 'Asia/Kolkata',
      openingEnabled = true,
      openingTime = '09:30',
      closingEnabled = true,
      closingTime = '18:30',
      daysOfWeek = [1, 2, 3, 4, 5],
      channelId = '#general',
      active = true,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Automation name is required' }, { status: 400 });
    }

    const cleanTz = sanitizeTimezone(timezone);
    const cleanOpeningTime = normalizeTime(openingTime);
    const cleanClosingTime = normalizeTime(closingTime);

    const created = await dbService.createSchedule({
      workspaceId: user.workspaceId,
      name: name.trim(),
      description: description ? description.trim() : 'Automated Daily Opening & Closing POD Dispatch',
      timezone: cleanTz,
      openingEnabled: Boolean(openingEnabled),
      openingTime: cleanOpeningTime,
      closingEnabled: Boolean(closingEnabled),
      closingTime: cleanClosingTime,
      daysOfWeek: Array.isArray(daysOfWeek) && daysOfWeek.length > 0 ? daysOfWeek : [1, 2, 3, 4, 5],
      channelId: channelId.trim() || '#general',
      active: Boolean(active),
    });

    const now = new Date();
    const livePreview: ScheduleLivePreview = {
      scheduleId: created.id,
      scheduleName: created.name,
      timezone: created.timezone,
      channel: created.channelId,
      active: created.active,
      opening: {
        enabled: created.openingEnabled,
        configuredTime: created.openingTime,
        nextRun: created.openingEnabled
          ? calculateNextRun(created.openingTime, created.daysOfWeek, created.timezone, now)
          : null,
      },
      closing: {
        enabled: created.closingEnabled,
        configuredTime: created.closingTime,
        nextRun: created.closingEnabled
          ? calculateNextRun(created.closingTime, created.daysOfWeek, created.timezone, now)
          : null,
      },
    };

    return NextResponse.json({
      message: 'Automation schedule created successfully',
      schedule: created,
      preview: livePreview,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Automations POST Error:', msg);
    return NextResponse.json({ error: 'Failed to create schedule', details: msg }, { status: 500 });
  }
}
