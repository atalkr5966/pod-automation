import { NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { sendSlackMessage } from '@/server/slack/client';

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { webhookUrl } = body;

    const testMsg = `🔔 *POD Automation Test Ping*\nConnection verified successfully for user *${user.username}* at ${new Date().toLocaleTimeString()}!`;
    const res = await sendSlackMessage({ webhookUrl, text: testMsg });
    return NextResponse.json(res);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Channel Test Error:', msg);
    return NextResponse.json({ error: 'Internal Server Error', details: msg }, { status: 500 });
  }
}
