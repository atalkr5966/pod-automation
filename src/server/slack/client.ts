import { DeliveryStatus } from '@/types';

export interface SlackSendOptions {
  webhookUrl?: string;
  botToken?: string;
  channel?: string;
  text: string;
}

export interface SlackSendResult {
  success: boolean;
  status: DeliveryStatus;
  messageTs?: string;
  channel?: string;
  error?: string;
  isTransient?: boolean;
  rawResponse?: Record<string, unknown>;
}

/**
 * Checks if a webhook or token is a placeholder or mock.
 */
export function isMockCredential(val?: string): boolean {
  if (!val) return true;
  const trimmed = val.trim();
  if (
    trimmed === '' ||
    trimmed.includes('YOUR/WEBHOOK/URL') ||
    trimmed.includes('your-bot-token') ||
    trimmed.includes('/test/mock/') ||
    trimmed.includes('hooks.slack.com/services/test/') ||
    (!trimmed.startsWith('https://hooks.slack.com/') && !trimmed.startsWith('xoxb-'))
  ) {
    return true;
  }
  return false;
}

/**
 * Masks sensitive URLs or tokens for safe UI display.
 * e.g. "https://hooks.slack.com/services/T00.../B00.../abc123" -> "https://hooks.slack.com/.../••••3abc"
 */
export function maskSlackCredential(cred?: string): string {
  if (!cred) return '';
  const trimmed = cred.trim();
  if (trimmed.length <= 12) return '••••••••';
  const prefix = trimmed.substring(0, 18);
  const suffix = trimmed.substring(trimmed.length - 4);
  return `${prefix}...••••${suffix}`;
}

/**
 * Sends a message to Slack using Webhook or Bot Token with automatic transient retry.
 */
export async function sendSlackMessage(
  options: SlackSendOptions,
  maxRetries: number = 2
): Promise<SlackSendResult> {
  const { webhookUrl, botToken, channel, text } = options;

  // Resolve target delivery mechanism
  const effectiveWebhook = webhookUrl || process.env.SLACK_WEBHOOK_URL;
  const effectiveToken = botToken || process.env.SLACK_BOT_TOKEN;

  // Simulation mode if credentials are mock or empty
  if (isMockCredential(effectiveWebhook) && isMockCredential(effectiveToken)) {
    console.warn('[SlackClient] No live Slack credentials configured. Simulating delivery.');
    return {
      success: true,
      status: 'SIMULATED',
      channel: channel || '#general',
      error: 'Simulated dispatch (No live Slack webhook or bot token configured in Slack Settings).',
      rawResponse: { simulated: true, timestamp: new Date().toISOString() },
    };
  }

  let attempt = 0;
  let lastError = '';
  let isTransient = false;

  while (attempt <= maxRetries) {
    attempt++;
    try {
      if (effectiveWebhook && !isMockCredential(effectiveWebhook)) {
        // Send via Incoming Webhook
        const res = await fetch(effectiveWebhook.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });

        if (res.ok) {
          return {
            success: true,
            status: 'SUCCESS',
            channel: channel || '#general',
            rawResponse: { ok: true, via: 'webhook' },
          };
        }

        const errText = await res.text();
        const statusCode = res.status;

        // Categorize Slack Webhook Errors
        if (statusCode === 429) {
          // Rate limited (Transient)
          isTransient = true;
          const retryAfterSec = parseInt(res.headers.get('Retry-After') || '2', 10);
          lastError = `Slack rate limit exceeded (HTTP 429). Retry after ${retryAfterSec}s.`;
          if (attempt <= maxRetries) {
            await new Promise((r) => setTimeout(r, Math.min(retryAfterSec * 1000, 3000)));
            continue;
          }
        } else if (statusCode >= 500) {
          // Temporary Slack infrastructure outage (Transient)
          isTransient = true;
          lastError = `Temporary Slack server error (HTTP ${statusCode}): ${errText}`;
          if (attempt <= maxRetries) {
            await new Promise((r) => setTimeout(r, attempt * 1500));
            continue;
          }
        } else {
          // Permanent failure (404 no_team, 400 bad_channel, etc.)
          isTransient = false;
          lastError = `Slack webhook rejected (HTTP ${statusCode}): ${errText}`;
          break;
        }
      } else if (effectiveToken && !isMockCredential(effectiveToken)) {
        // Send via Slack Web API (chat.postMessage)
        const targetChannel = channel || '#general';
        const res = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            Authorization: `Bearer ${effectiveToken.trim()}`,
          },
          body: JSON.stringify({
            channel: targetChannel,
            text,
          }),
        });

        const json = await res.json();
        if (json.ok) {
          return {
            success: true,
            status: 'SUCCESS',
            messageTs: json.ts,
            channel: json.channel || targetChannel,
            rawResponse: json,
          };
        }

        // Map Slack API error codes
        const slackErr = json.error || 'unknown_error';
        if (slackErr === 'ratelimited') {
          isTransient = true;
          lastError = `Slack API rate limited.`;
          if (attempt <= maxRetries) {
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
        } else if (slackErr === 'channel_not_found') {
          isTransient = false;
          lastError = `Channel '${targetChannel}' was not found or the bot is not invited to it.`;
          break;
        } else if (slackErr === 'invalid_auth' || slackErr === 'token_revoked' || slackErr === 'account_inactive') {
          isTransient = false;
          lastError = `Slack authentication failed (${slackErr}). Please reconnect your Slack workspace.`;
          break;
        } else if (slackErr === 'missing_scope') {
          isTransient = false;
          lastError = `Slack bot is missing required permissions (needed: chat:write).`;
          break;
        } else {
          isTransient = false;
          lastError = `Slack API error: ${slackErr}`;
          break;
        }
      }
    } catch (err: unknown) {
      // Network/DNS error (Transient)
      isTransient = true;
      const msg = err instanceof Error ? err.message : String(err);
      lastError = `Network connection failure: ${msg}`;
      if (attempt <= maxRetries) {
        await new Promise((r) => setTimeout(r, attempt * 1000));
        continue;
      }
    }
  }

  return {
    success: false,
    status: 'FAILED',
    channel: channel || '#general',
    error: lastError,
    isTransient,
    rawResponse: { error: lastError, attempts: attempt },
  };
}
