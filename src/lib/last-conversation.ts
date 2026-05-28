export const LAST_CONVERSATION_COOKIE = "nexus_last_conversation_id";
export const LAST_CONVERSATION_STORAGE_KEY = "nexus:last-conversation-id";
export const DASHBOARD_VIEW_PARAM = "dashboard";

export function isSafeConversationId(value: string | undefined): value is string {
  return Boolean(value && /^[a-zA-Z0-9_-]{8,128}$/.test(value));
}
