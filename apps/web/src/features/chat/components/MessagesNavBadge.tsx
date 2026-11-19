// apps/web/src/features/chat/components/MessagesNavBadge.tsx
"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";

export function MessagesNavBadge() {
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