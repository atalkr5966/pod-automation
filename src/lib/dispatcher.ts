import { User, addHistoryEntry, PodHistoryEntry } from './storage';

export interface DispatchResult {
  channel: 'slack';
  success: boolean;
  simulated?: boolean;
  message?: string;
  error?: string;
  historyEntry?: PodHistoryEntry;
}

export function isMockOrEmptyWebhook(url?: string): boolean {
  if (!url) return true;
  const trimmed = url.trim();
  if (
    trimmed === '' ||
    trimmed.includes('YOUR/WEBHOOK/URL') ||
    trimmed.includes('/test/mock/') ||
    trimmed.includes('hooks.slack.com/services/test/') ||
    !trimmed.startsWith('https://hooks.slack.com/')
  ) {
    return true;
  }
  return false;
}

export async function sendToSlack(
  webhookUrl: string,
  text: string
): Promise<{ success: boolean; simulated?: boolean; error?: string }> {
  let targetUrl = webhookUrl?.trim();

  // If user webhook is empty or mock, try falling back to env variable
  if (isMockOrEmptyWebhook(targetUrl)) {
    const envUrl = process.env.SLACK_WEBHOOK_URL?.trim();
    if (envUrl && !isMockOrEmptyWebhook(envUrl)) {
      targetUrl = envUrl;
    }
  }

  // If still mock or empty, run in simulation mode
  if (isMockOrEmptyWebhook(targetUrl)) {
    console.warn('[Slack] Live Webhook URL not configured. Simulating dispatch.');
    return {
      success: true,
      simulated: true,
      error: 'Simulated (No live Slack webhook configured. Please set your Webhook URL in Slack Settings)',
    };
  }

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (res.ok) {
      return { success: true };
    } else {
      const errText = await res.text();
      return { success: false, error: `Slack API error (HTTP ${res.status}): ${errText}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to connect to Slack webhook' };
  }
}

export async function dispatchPodMessage(params: {
  user: User;
  type: 'OPENING' | 'CLOSING';
  content: string;
}): Promise<DispatchResult[]> {
  const { user, type, content } = params;
  const webhookUrl = user.channels?.slack?.webhookUrl || process.env.SLACK_WEBHOOK_URL || '';

  const slackRes = await sendToSlack(webhookUrl, content);
  const hist = addHistoryEntry({
    userId: user.id,
    username: user.username,
    type,
    channel: 'slack',
    content,
    status: slackRes.simulated ? 'SIMULATED' : slackRes.success ? 'SUCCESS' : 'FAILED',
    error: slackRes.error,
  });

  return [
    {
      channel: 'slack',
      success: slackRes.success,
      simulated: slackRes.simulated,
      error: slackRes.error,
      historyEntry: hist,
    },
  ];
}

