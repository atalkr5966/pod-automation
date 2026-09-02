import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/storage';
import { sendToSlack } from '@/lib/dispatcher';

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
    const { webhookUrl } = body;

    const testMsg = `🔔 *POD Automation Test Ping*\nConnection verified successfully for user *${user.username}* at ${new Date().toLocaleTimeString()}!`;
    const targetUrl = webhookUrl || user.channels?.slack?.webhookUrl;

    const res = await sendToSlack(targetUrl, testMsg);
    return NextResponse.json(res);
  } catch (err: any) {
    console.error('Channel Test Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
