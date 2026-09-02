import { NextResponse } from 'next/server';
import { validateSession, getAllHistory } from '@/lib/storage';

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

    const history = getAllHistory(user.id);

    return NextResponse.json({
      history,
    });
  } catch (err: any) {
    console.error('History GET Error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch history' }, { status: 500 });
  }
}
