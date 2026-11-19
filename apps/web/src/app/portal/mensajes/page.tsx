// apps/web/src/app/portal/mensajes/page.tsx
"use client";

import { Suspense } from "react";
import { MessagesOfflineGuard } from "@/features/chat/components/MessagesOfflineGuard";

function Messages() {
  return <main className="mx-auto max-w-7xl px-3 py-5 sm:px-6" />;
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