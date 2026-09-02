import { User, addHistoryEntry, PodHistoryEntry } from './storage';

export interface DispatchResult {
  channel: 'slack';
  success: boolean;
  simulated?: boolean;
  message?: string;
  error?: string;
  historyEntry?: PodHistoryEntry;
}

export async function sendToSlack(webhookUrl: string, text: string): Promise<{ success: boolean; simulated?: boolean; error?: string }> {
  if (!webhookUrl || webhookUrl.includes('YOUR/WEBHOOK/URL') || webhookUrl.trim() === '') {
    console.warn('[Slack] Webhook URL not configured. Simulating success.');
    return { success: true, simulated: true, error: 'Simulated (no real Slack webhook configured)' };
  }

  try {
    const res = await fetch(webhookUrl, {
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
  const webhookUrl = user.channels?.slack?.webhookUrl || '';

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

