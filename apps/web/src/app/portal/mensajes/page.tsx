// apps/web/src/app/portal/mensajes/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authenticatedFetch } from "@/shared/services/auth-session";
import {
  getConversation,
  type ConversationSummary,
} from "@/shared/services/chat-conversation.service";
import { useConversations } from "@/features/chat/hooks/useConversations";
import { MessagesOfflineGuard } from "@/features/chat/components/MessagesOfflineGuard";

type Tab = "inbox" | "requests" | "declined";

function Messages() {
  const params = useSearchParams();
  const { conversations, loading, error, reload } = useConversations();
  const [actorId, setActorId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    params.get("conversation"),
  );
  const [external, setExternal] = useState<ConversationSummary | null>(null);
  const [compose, setCompose] = useState(Boolean(params.get("recipient")));
  const [tab, setTab] = useState<Tab>("inbox");
  const [notice, setNotice] = useState("");

  const selected =
    conversations.find((item) => item.id === selectedId) ??
    (external?.id === selectedId ? external : null);

  useEffect(() => {
    let active = true;
    void authenticatedFetch("/api/v1/user/me")
      .then(async (response) => {
        if (!response.ok) throw new Error("session");
        const result = (await response.json()) as { data: { id: string } };
        if (active) setActorId(result.data.id);
      })
      .catch(() => {
        if (active) setSessionError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setSelectedId(params.get("conversation"));
    setCompose(Boolean(params.get("recipient")));
  }, [params]);

  useEffect(() => {
    if (!selectedId || conversations.some((item) => item.id === selectedId))
      return;
    let active = true;
    void getConversation(selectedId)
      .then((value) => {
        if (active) setExternal(value);
      })
      .catch(() => {
        if (active)
          setNotice(
            "No se pudo abrir la conversación. Comprueba que participas en ella.",
          );
      });
    return () => {
      active = false;
    };
  }, [selectedId, conversations]);

  if (sessionError)
    return (
      <div className="mx-auto max-w-3xl p-8">
        <p>No fue posible comprobar tu sesión.</p>
        <a href="/login" className="underline">
          Iniciar sesión
        </a>
      </div>
    );

  return (
    <main className="mx-auto max-w-7xl px-3 py-5 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mensajes</h1>
          <p className="text-sm text-slate-500">
            Conecta con tu comunidad profesional
          </p>
        </div>
      </div>
    </main>
  );
}

export default function MessagesPage() {
  return (
    <MessagesOfflineGuard>
      <Suspense fallback={<p className="p-6">Cargando mensajes…</p>}>
        <Messages />
      </Suspense>
    </MessagesOfflineGuard>
  );
}