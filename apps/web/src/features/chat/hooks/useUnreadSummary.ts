// apps/web/src/features/chat/hooks/useUnreadSummary.ts
"use client";

import { type ConversationSummary } from "@/shared/services/chat-conversation.service";

export const UNREAD_PANEL_LIMIT = 5;

export type UnreadConversation = ConversationSummary & { unreadCount: number };

export interface UnreadSummary {
  total: number;
  conversations: UnreadConversation[];
}

export const buildUnreadSummary = (
  items: ConversationSummary[],
  limit = UNREAD_PANEL_LIMIT,
): UnreadSummary => {
  const unread = items.filter(
    (item) => item.unreadCount > 0 && item.status !== "RECHAZADO",
  );
  return {
    total: unread.reduce((sum, item) => sum + item.unreadCount, 0),
    conversations: [...unread]
      .sort(
        (a, b) => Date.parse(b.lastActivityAt) - Date.parse(a.lastActivityAt),
      )
      .slice(0, limit),
  };
};