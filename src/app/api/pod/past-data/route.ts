import { NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { dbService } from '@/server/db';
import { analyzeUserPatterns } from '@/lib/analyzer';

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const pastData = await dbService.getPastData(user.workspaceId);
    const insights = analyzeUserPatterns(pastData);

    return NextResponse.json({
      pastData,
      insights,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Past-Data GET Error:', msg);
    return NextResponse.json({ error: 'Failed to fetch past data', details: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { date, type = 'GENERAL', tasks, notes, category, rawText } = body;

    let newTasks: string[] = [];
    if (Array.isArray(tasks)) {
      newTasks = tasks.map((t: string) => t.trim()).filter((t: string) => t.length > 0);
    } else if (rawText && typeof rawText === 'string') {
      newTasks = rawText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
    }

    if (newTasks.length === 0) {
      return NextResponse.json({ error: 'At least one sprint task is required' }, { status: 400 });
    }

    const created = await dbService.addPastData({
      workspaceId: user.workspaceId,
      userId: user.id,
      date: date || new Date().toISOString().split('T')[0],
      type: type || 'GENERAL',
      tasks: newTasks,
      notes: notes || '',
      category: category || 'Sprint Tasks',
    });

    const updatedPastData = await dbService.getPastData(user.workspaceId);
    const insights = analyzeUserPatterns(updatedPastData);

    return NextResponse.json({
      success: true,
      message: 'Sprint log saved successfully',
      entry: created,
      pastData: updatedPastData,
      insights,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Past-Data POST Error:', msg);
    return NextResponse.json({ error: 'Failed to add past data entry', details: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Log ID is required' }, { status: 400 });
    }

    await dbService.deletePastData(id);
    const updatedPastData = await dbService.getPastData(user.workspaceId);
    const insights = analyzeUserPatterns(updatedPastData);

    return NextResponse.json({
      success: true,
      message: 'Log deleted successfully',
      pastData: updatedPastData,
      insights,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Past-Data DELETE Error:', msg);
    return NextResponse.json({ error: 'Failed to delete past data entry', details: msg }, { status: 500 });
  }
}
