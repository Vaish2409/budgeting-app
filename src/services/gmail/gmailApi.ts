import { getValidAccessToken } from "./useGoogleAuth";
import { PROCESSED_LABEL_NAME } from "./authConfig";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

async function gmailFetch(path: string, init?: RequestInit): Promise<any> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Not connected to Gmail — reconnect in Settings.");

  const res = await fetch(`${GMAIL_API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gmail API ${path} failed: ${res.status} ${body}`);
  }
  return res.json();
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
}

export interface GmailMessage {
  id: string;
  sender: string;
  subject: string;
  body: string;
  internalDate: string; // epoch ms as string
}

/**
 * Lists message IDs not yet labeled processed, restricted to the user's
 * configured bank sender allowlist (FR4) so unrelated mail is never touched.
 */
export async function listNewMessages(
  senderAllowlist: string[],
  maxResults = 25
): Promise<GmailMessageSummary[]> {
  const senderQuery =
    senderAllowlist.length > 0
      ? `(${senderAllowlist.map((s) => `from:${s}`).join(" OR ")})`
      : "";
  const q = `${senderQuery} -label:${PROCESSED_LABEL_NAME.replace("/", "-")}`.trim();
  const data = await gmailFetch(`/messages?q=${encodeURIComponent(q)}&maxResults=${maxResults}`);
  return data.messages ?? [];
}

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  try {
    // atob is available in Hermes on modern RN/Expo runtimes.
    return decodeURIComponent(
      atob(normalized)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
  } catch {
    return "";
  }
}

function extractBody(payload: any): string {
  if (!payload) return "";
  if (payload.body?.data) return decodeBase64Url(payload.body.data);
  if (payload.parts) {
    const textPart =
      payload.parts.find((p: any) => p.mimeType === "text/plain") ??
      payload.parts.find((p: any) => p.mimeType === "text/html");
    if (textPart) return extractBody(textPart);
    for (const part of payload.parts) {
      const nested = extractBody(part);
      if (nested) return nested;
    }
  }
  return "";
}

export async function getMessage(id: string): Promise<GmailMessage> {
  const data = await gmailFetch(`/messages/${id}?format=full`);
  const headers: { name: string; value: string }[] = data.payload?.headers ?? [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

  return {
    id: data.id,
    sender: getHeader("From"),
    subject: getHeader("Subject"),
    body: extractBody(data.payload).replace(/<[^>]+>/g, " "), // strip HTML tags if present
    internalDate: data.internalDate,
  };
}

let processedLabelId: string | null = null;

async function ensureProcessedLabel(): Promise<string> {
  if (processedLabelId) return processedLabelId;
  const data = await gmailFetch("/labels");
  const existing = (data.labels ?? []).find((l: any) => l.name === PROCESSED_LABEL_NAME);
  if (existing) {
    processedLabelId = existing.id;
    return existing.id;
  }
  const created = await gmailFetch("/labels", {
    method: "POST",
    body: JSON.stringify({ name: PROCESSED_LABEL_NAME, labelListVisibility: "labelShow", messageListVisibility: "show" }),
  });
  processedLabelId = created.id;
  return created.id;
}

/** Labels a message processed so it isn't reparsed (FR9). */
export async function markProcessed(messageId: string): Promise<void> {
  const labelId = await ensureProcessedLabel();
  await gmailFetch(`/messages/${messageId}/modify`, {
    method: "POST",
    body: JSON.stringify({ addLabelIds: [labelId] }),
  });
}
