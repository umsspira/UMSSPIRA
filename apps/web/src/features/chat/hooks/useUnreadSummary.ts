// apps/web/src/features/chat/hooks/useUnreadSummary.ts
"use client";

import { useCallback, useRef, useState } from "react";
import {
  getUnreadSummary,
  type ConversationSummary,
} from "@/shared/services/chat-conversation.service";

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

export const useUnreadSummary = () => {
  const [summary, setSummary] = useState<UnreadSummary>({
    total: 0,
    conversations: [],
  });
  const version = useRef(0);

  const refresh = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const request = ++version.current;
    try {
      const result = await getUnreadSummary();
      if (request === version.current) setSummary(result);
    } catch {
      /* Conservar el resumen durante cortes de red. */
    }
  }, []);

  return { summary, reload: refresh };
};