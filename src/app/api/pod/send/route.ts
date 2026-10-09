import { NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { dbService } from '@/server/db';
import { sendSlackMessage } from '@/server/slack/client';

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { type = 'OPENING', content, channel } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const slackConn = await dbService.getSlackConnection(user.workspaceId);
    const targetChannel = channel || slackConn?.defaultChannel || '#general';
    const startTime = Date.now();

    const sendRes = await sendSlackMessage({
      webhookUrl: slackConn?.webhookUrl,
      botToken: slackConn?.botAccessToken,
      channel: targetChannel,
      text: content,
    });

    const durationMs = Date.now() - startTime;
    const execLog = await dbService.recordExecutionStart({
      executionKey: `exec_manual_pod_${type}_${Date.now()}`,
      actionType: type,
      channel: targetChannel,
    });

    await dbService.recordDelivery({
      executionId: execLog.id,
      slackChannelId: targetChannel,
      status: sendRes.status,
      response: sendRes.rawResponse,
    });

    await dbService.recordExecutionComplete(execLog.id, {
      status: sendRes.success ? 'SUCCESS' : 'FAILED',
      durationMs,
      errorMessage: sendRes.error,
    });

    return NextResponse.json({
      success: sendRes.success,
      status: sendRes.status,
      message: sendRes.success
        ? `Successfully dispatched ${type} POD to ${targetChannel}!`
        : `Failed to dispatch: ${sendRes.error}`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Send POD Error:', msg);
    return NextResponse.json({ error: 'Failed to dispatch POD', details: msg }, { status: 500 });
  }
}
