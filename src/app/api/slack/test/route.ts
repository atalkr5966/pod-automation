import { NextResponse } from 'next/server';
import { dbService } from '@/server/db';
import { getSessionUser } from '@/server/auth';
import { sendSlackMessage } from '@/server/slack/client';
import { generateOpeningPod, generateClosingPod } from '@/lib/analyzer';

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { action = 'ping', channel, webhookUrl } = body;

    const slackConn = await dbService.getSlackConnection(user.workspaceId);
    const targetWebhook = webhookUrl || slackConn?.webhookUrl;
    const targetToken = slackConn?.botAccessToken;
    const targetChannel = channel || slackConn?.defaultChannel || '#general';

    let messageText = '';
    const now = new Date();

    if (action === 'ping') {
      messageText = `🔔 *POD Automation Connection Verified*\nVerified by *${user.name}* (@${user.username}) at ${now.toLocaleTimeString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'})\nWorkspace: ${user.workspaceId}\nChannel: ${targetChannel}`;
    } else if (action === 'test-opening') {
      const pastData = await dbService.getPastData(user.workspaceId);
      messageText = generateOpeningPod(pastData);
    } else if (action === 'test-closing') {
      const pastData = await dbService.getPastData(user.workspaceId);
      messageText = generateClosingPod(pastData);
    } else {
      return NextResponse.json({ error: 'Invalid test action' }, { status: 400 });
    }

    const startTime = Date.now();
    const sendRes = await sendSlackMessage({
      webhookUrl: targetWebhook,
      botToken: targetToken,
      channel: targetChannel,
      text: messageText,
    });
    const durationMs = Date.now() - startTime;

    // Record execution & delivery for visibility in Activity logs
    if (action === 'test-opening' || action === 'test-closing') {
      const actionType = action === 'test-opening' ? 'OPENING' : 'CLOSING';
      const execLog = await dbService.recordExecutionStart({
        executionKey: `exec_manual_test_${actionType}_${now.getTime()}`,
        actionType,
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
    }

    if (sendRes.success && slackConn) {
      await dbService.upsertSlackConnection({
        workspaceId: user.workspaceId,
        lastTestedAt: now.toISOString(),
      });
    }

    return NextResponse.json({
      success: sendRes.success,
      status: sendRes.status,
      channel: sendRes.channel,
      durationMs,
      error: sendRes.error,
      simulated: sendRes.status === 'SIMULATED',
      message: sendRes.success
        ? `Successfully sent ${action} to Slack (${targetChannel})`
        : `Slack delivery failed: ${sendRes.error}`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Slack Test Error:', msg);
    return NextResponse.json({ error: 'Failed to execute Slack test', details: msg }, { status: 500 });
  }
}
