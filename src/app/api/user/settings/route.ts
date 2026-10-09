import { NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { dbService } from '@/server/db';

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const fullUser = await dbService.findUserById(user.id);
    const slackConn = await dbService.getSlackConnection(user.workspaceId);
    const schedules = await dbService.listSchedules(user.workspaceId);

    return NextResponse.json({
      name: fullUser?.name,
      username: fullUser?.username,
      email: fullUser?.email,
      slackConnection: slackConn,
      schedules,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Settings GET Error:', msg);
    return NextResponse.json({ error: 'Internal Server Error', details: msg }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { name, channels } = body;

    if (name !== undefined) {
      await dbService.updateUser(user.id, { name });
    }

    if (channels?.slack?.webhookUrl !== undefined) {
      await dbService.upsertSlackConnection({
        workspaceId: user.workspaceId,
        webhookUrl: channels.slack.webhookUrl,
        status: channels.slack.webhookUrl ? 'CONNECTED' : 'DISCONNECTED',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Settings PUT Error:', msg);
    return NextResponse.json({ error: 'Failed to update settings', details: msg }, { status: 500 });
  }
}
