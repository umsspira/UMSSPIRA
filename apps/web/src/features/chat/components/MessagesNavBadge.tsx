// apps/web/src/features/chat/components/MessagesNavBadge.tsx
"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { useUnreadSummary } from "../hooks/useUnreadSummary";
import { useOnlineStatus } from "@/shared/hooks/use-online-status";

/**
 * CA-01 — Contador total con «99+».
 * CA-05 — Se actualiza sin recargar (useUnreadSummary escucha chat:changed).
 * CA-07 — Sin conexión no se muestra contador.
 * CA-08 — Solo se actualiza el indicador en pantalla.
 */
export function MessagesNavBadge() {
  const { summary } = useUnreadSummary();
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

  const total = summary.total;
  const label = total > 0 ? `Mensajes, ${total} sin leer` : "Mensajes";

  return (
    <Link
      href="/portal/mensajes"
      aria-label={label}
      className="relative inline-flex p-2"
    >
      <MessageSquare size={22} aria-hidden="true" />
      {total > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white"
        >
          {total > 99 ? "99+" : total}
        </span>
      )}
    </Link>
  );
}