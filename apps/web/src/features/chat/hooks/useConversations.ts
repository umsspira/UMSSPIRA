// apps/web/src/features/chat/hooks/useConversations.ts
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getMyConversations,
  type ConversationSummary,
} from "@/shared/services/chat-conversation.service";

export const useConversations = () => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const version = useRef(0);

  const load = useCallback(async () => {
    const request = ++version.current;
    try {
      const items = await getMyConversations();
      if (request === version.current) {
        setConversations(items);
        setError(null);
      }
    } catch (error) {
      if (request === version.current)
        setError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los mensajes",
        );
    } finally {
      if (request === version.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { conversations, loading, error, reload: load, retry: load };
};