import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/storage';
import { dispatchPodMessage } from '@/lib/dispatcher';

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
    const { type = 'OPENING', content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const results = await dispatchPodMessage({
      user,
      type,
      content,
    });

    const hasSuccess = results.some((r) => r.success);

    return NextResponse.json({
      success: hasSuccess,
      results,
      message: hasSuccess
        ? `Successfully dispatched ${type} POD to Slack!`
        : `Failed to dispatch to Slack webhook.`,
    });
  } catch (err: any) {
    console.error('Send POD Error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to dispatch POD' }, { status: 500 });
  }
}
