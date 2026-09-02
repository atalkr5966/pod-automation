import { NextResponse } from 'next/server';
import { validateSession, updateUser } from '@/lib/storage';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null;

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = validateSession(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    return NextResponse.json({
      name: user.name,
      username: user.username,
      email: user.email,
      channels: user.channels,
      schedule: user.schedule,
    });
  } catch (err: any) {
    console.error('Settings GET Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null;

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = validateSession(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const body = await request.json();
    const { name, channels, schedule } = body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (channels !== undefined) updates.channels = channels;
    if (schedule !== undefined) updates.schedule = schedule;

    const updatedUser = updateUser(user.id, updates);

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      settings: {
        name: updatedUser?.name,
        channels: updatedUser?.channels,
        schedule: updatedUser?.schedule,
      },
    });
  } catch (err: any) {
    console.error('Settings PUT Error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to update settings' }, { status: 500 });
  }
}
