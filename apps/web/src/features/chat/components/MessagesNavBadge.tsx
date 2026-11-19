// apps/web/src/features/chat/components/MessagesNavBadge.tsx
"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { useUnreadSummary } from "../hooks/useUnreadSummary";
import { useOnlineStatus } from "@/shared/hooks/use-online-status";

/**
 * CA-01 — Contador total con «99+».
 * CA-07 — Sin conexión no se muestra contador.
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

  return (
    <Link
      href="/portal/mensajes"
      aria-label="Mensajes"
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