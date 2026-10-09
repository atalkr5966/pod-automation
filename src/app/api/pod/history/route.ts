import { NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { dbService } from '@/server/db';

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const logs = await dbService.listExecutionLogs(user.workspaceId);
    return NextResponse.json({ history: logs });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('History GET Error:', msg);
    return NextResponse.json({ error: 'Failed to fetch history', details: msg }, { status: 500 });
  }
}
