import { NextResponse } from 'next/server';
import { dbService } from '@/server/db';
import { getSessionUser } from '@/server/auth';

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const filterStatus = searchParams.get('status');

    let logs = await dbService.listExecutionLogs(user.workspaceId, limit);
    if (filterStatus) {
      logs = logs.filter((l) => l.status === filterStatus);
    }

    const stats = await dbService.getDashboardStats(user.workspaceId);

    return NextResponse.json({
      logs,
      stats,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Activity GET Error:', msg);
    return NextResponse.json({ error: 'Failed to retrieve activity logs', details: msg }, { status: 500 });
  }
}
