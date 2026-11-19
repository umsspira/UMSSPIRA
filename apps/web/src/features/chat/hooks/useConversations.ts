// apps/web/src/features/chat/hooks/useConversations.ts
"use client";
import { useState } from "react";
import { type ConversationSummary } from "@/shared/services/chat-conversation.service";

export const useConversations = () => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  return { conversations, loading, error };
};