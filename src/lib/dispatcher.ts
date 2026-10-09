import { sendSlackMessage, isMockCredential } from '@/server/slack/client';

export { isMockCredential as isMockOrEmptyWebhook };

export async function sendToSlack(
  webhookUrl: string,
  text: string
): Promise<{ success: boolean; simulated?: boolean; error?: string }> {
  const result = await sendSlackMessage({ webhookUrl, text });
  return {
    success: result.success,
    simulated: result.status === 'SIMULATED',
    error: result.error,
  };
}
