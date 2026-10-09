import { NextResponse } from 'next/server';
import { dbService } from '@/server/db';
import { getSessionUser } from '@/server/auth';
import { maskSlackCredential, isMockCredential } from '@/server/slack/client';

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const conn = await dbService.getSlackConnection(user.workspaceId);
    if (!conn) {
      return NextResponse.json({
        connected: false,
        status: 'DISCONNECTED',
      });
    }

    return NextResponse.json({
      connected: conn.status === 'CONNECTED',
      status: conn.status,
      teamName: conn.slackTeamName || 'Slack Workspace',
      defaultChannel: conn.defaultChannel || '#general',
      maskedWebhookUrl: maskSlackCredential(conn.webhookUrl),
      hasBotToken: !!conn.botAccessToken && !isMockCredential(conn.botAccessToken),
      lastTestedAt: conn.lastTestedAt,
      lastDeliveryAt: conn.lastDeliveryAt,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Failed to retrieve Slack status', details: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { webhookUrl, botAccessToken, defaultChannel = '#general', slackTeamName } = body;

    const cleanWebhook = webhookUrl?.trim();
    const cleanToken = botAccessToken?.trim();

    if (!cleanWebhook && !cleanToken) {
      return NextResponse.json(
        { error: 'Please provide either a Slack Webhook URL or Bot User Token' },
        { status: 400 }
      );
    }

    const conn = await dbService.upsertSlackConnection({
      workspaceId: user.workspaceId,
      webhookUrl: cleanWebhook || undefined,
      botAccessToken: cleanToken || undefined,
      defaultChannel: defaultChannel.trim() || '#general',
      slackTeamName: slackTeamName?.trim() || 'Slack Team',
      status: 'CONNECTED',
      lastTestedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Slack workspace connection saved successfully',
      teamName: conn.slackTeamName,
      defaultChannel: conn.defaultChannel,
      maskedWebhookUrl: maskSlackCredential(conn.webhookUrl),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Failed to save Slack settings', details: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await dbService.disconnectSlack(user.workspaceId);
    return NextResponse.json({ success: true, message: 'Slack workspace disconnected' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Failed to disconnect Slack', details: msg }, { status: 500 });
  }
}
