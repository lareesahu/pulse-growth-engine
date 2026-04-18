import type { ExecutionPayload } from "../../drizzle/schema";

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode: number;
  response?: unknown;
}

/** Push an ExecutionPayload to any external agent via HTTP webhook (Manus, n8n, Zapier, etc.). */
export async function sendToWebhook(params: {
  webhookUrl: string;
  payload: ExecutionPayload;
  secret?: string;
}): Promise<WebhookDeliveryResult> {
  const { webhookUrl, payload, secret } = params;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "Pulse-Growth-Engine/1.0",
  };
  if (secret) headers["X-Pulse-Signature"] = secret;

  const body = JSON.stringify({
    event: "payload.ready",
    timestamp: new Date().toISOString(),
    payload,
  });

  const resp = await fetch(webhookUrl, { method: "POST", headers, body });

  const responseBody = await resp.json().catch(() => null);

  if (!resp.ok) {
    throw new Error(
      `Webhook delivery failed (${resp.status}): ${JSON.stringify(responseBody).slice(0, 200)}`,
    );
  }

  return { success: true, statusCode: resp.status, response: responseBody };
}
