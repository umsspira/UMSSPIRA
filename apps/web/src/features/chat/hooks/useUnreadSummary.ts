// apps/web/src/features/chat/hooks/useUnreadSummary.ts
"use client";

import { type ConversationSummary } from "@/shared/services/chat-conversation.service";

export const UNREAD_PANEL_LIMIT = 5;

export type UnreadConversation = ConversationSummary & { unreadCount: number };

export interface UnreadSummary {
  total: number;
  conversations: UnreadConversation[];
}