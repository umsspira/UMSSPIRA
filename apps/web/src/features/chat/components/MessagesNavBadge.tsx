// apps/web/src/features/chat/components/MessagesNavBadge.tsx
"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { useOnlineStatus } from "@/shared/hooks/use-online-status";

/**
 * CA-07 — Sin conexión no se muestra contador.
 */
export function MessagesNavBadge() {
  const isOnline = useOnlineStatus();

  if (!isOnline) {
    return (
      <Link
        href="/portal/mensajes"
        aria-label="Mensajes (requiere conexión)"
        className="relative inline-flex p-2"
      >
        <MessageSquare size={22} aria-hidden="true" />
      </Link>
    );
  }

  return (
    <Link
      href="/portal/mensajes"
      aria-label="Mensajes"
      className="relative inline-flex p-2"
    >
      <MessageSquare size={22} aria-hidden="true" />
    </Link>
  );
}