import { NextResponse } from 'next/server';
import { dbService } from '@/server/db';
import { getSessionUser } from '@/server/auth';
import { calculateNextRun, sanitizeTimezone, normalizeTime } from '@/lib/timezone';
import { ScheduleLivePreview, AutomationSchedule } from '@/types';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await context.params;
    const schedule = await dbService.getScheduleById(id);
    if (!schedule || schedule.workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    const now = new Date();
    const preview: ScheduleLivePreview = {
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      timezone: schedule.timezone,
      channel: schedule.channelId,
      active: schedule.active,
      opening: {
        enabled: schedule.openingEnabled,
        configuredTime: schedule.openingTime,
        nextRun: schedule.openingEnabled
          ? calculateNextRun(schedule.openingTime, schedule.daysOfWeek, schedule.timezone, now)
          : null,
      },
      closing: {
        enabled: schedule.closingEnabled,
        configuredTime: schedule.closingTime,
        nextRun: schedule.closingEnabled
          ? calculateNextRun(schedule.closingTime, schedule.daysOfWeek, schedule.timezone, now)
          : null,
      },
    };

    return NextResponse.json({ schedule, preview });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Failed to retrieve schedule', details: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await context.params;
    const existing = await dbService.getScheduleById(id);
    if (!existing || existing.workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    const body = await request.json();
    const updates: Partial<AutomationSchedule> = {};

    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description.trim();
    if (body.timezone !== undefined) updates.timezone = sanitizeTimezone(body.timezone);
    if (body.openingEnabled !== undefined) updates.openingEnabled = Boolean(body.openingEnabled);
    if (body.openingTime !== undefined) updates.openingTime = normalizeTime(body.openingTime);
    if (body.closingEnabled !== undefined) updates.closingEnabled = Boolean(body.closingEnabled);
    if (body.closingTime !== undefined) updates.closingTime = normalizeTime(body.closingTime);
    if (body.daysOfWeek !== undefined && Array.isArray(body.daysOfWeek)) updates.daysOfWeek = body.daysOfWeek;
    if (body.channelId !== undefined) updates.channelId = body.channelId.trim();
    if (body.active !== undefined) updates.active = Boolean(body.active);

    const updated = await dbService.updateSchedule(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
    }

    const now = new Date();
    const preview: ScheduleLivePreview = {
      scheduleId: updated.id,
      scheduleName: updated.name,
      timezone: updated.timezone,
      channel: updated.channelId,
      active: updated.active,
      opening: {
        enabled: updated.openingEnabled,
        configuredTime: updated.openingTime,
        nextRun: updated.openingEnabled
          ? calculateNextRun(updated.openingTime, updated.daysOfWeek, updated.timezone, now)
          : null,
      },
      closing: {
        enabled: updated.closingEnabled,
        configuredTime: updated.closingTime,
        nextRun: updated.closingEnabled
          ? calculateNextRun(updated.closingTime, updated.daysOfWeek, updated.timezone, now)
          : null,
      },
    };

    return NextResponse.json({
      message: 'Schedule updated successfully',
      schedule: updated,
      preview,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Failed to update schedule', details: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await context.params;
    const existing = await dbService.getScheduleById(id);
    if (!existing || existing.workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    await dbService.deleteSchedule(id);
    return NextResponse.json({ success: true, message: 'Schedule deleted successfully' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Failed to delete schedule', details: msg }, { status: 500 });
  }
}
