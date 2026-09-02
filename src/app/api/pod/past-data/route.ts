import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { validateSession, updateUser, PastDataEntry } from '@/lib/storage';
import { analyzeUserPatterns } from '@/lib/analyzer';

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

    const pastData = user.pastData || [];
    const insights = analyzeUserPatterns(pastData);

    return NextResponse.json({
      pastData,
      insights,
    });
  } catch (err: any) {
    console.error('Past-Data GET Error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch past data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
    const { date, type = 'GENERAL', tasks, notes, category, rawText } = body;

    let newTasks: string[] = [];
    if (Array.isArray(tasks)) {
      newTasks = tasks.map((t: string) => t.trim()).filter((t: string) => t.length > 0);
    } else if (rawText && typeof rawText === 'string') {
      // Split raw text lines into tasks
      newTasks = rawText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
    }

    if (newTasks.length === 0) {
      return NextResponse.json({ error: 'At least one task is required' }, { status: 400 });
    }

    const newEntry: PastDataEntry = {
      id: `log_${crypto.randomUUID()}`,
      date: date || new Date().toISOString().split('T')[0],
      type: type || 'GENERAL',
      tasks: newTasks,
      notes: notes || '',
      category: category || 'Sprint Tasks',
      createdAt: new Date().toISOString(),
    };

    const currentPastData = user.pastData || [];
    const updatedPastData = [newEntry, ...currentPastData];

    updateUser(user.id, { pastData: updatedPastData });
    const insights = analyzeUserPatterns(updatedPastData);

    return NextResponse.json({
      success: true,
      message: 'Past data entry added successfully',
      entry: newEntry,
      pastData: updatedPastData,
      insights,
    });
  } catch (err: any) {
    console.error('Past-Data POST Error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to add past data entry' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Log ID is required' }, { status: 400 });
    }

    const currentPastData = user.pastData || [];
    const updatedPastData = currentPastData.filter((item) => item.id !== id);

    updateUser(user.id, { pastData: updatedPastData });
    const insights = analyzeUserPatterns(updatedPastData);

    return NextResponse.json({
      success: true,
      message: 'Past data entry deleted successfully',
      pastData: updatedPastData,
      insights,
    });
  } catch (err: any) {
    console.error('Past-Data DELETE Error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to delete past data entry' }, { status: 500 });
  }
}
