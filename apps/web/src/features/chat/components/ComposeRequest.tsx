// apps/web/src/features/chat/components/ComposeRequest.tsx
"use client";
import { type FormEvent } from "react";
import type { ChatContact } from "@/shared/services/chat-conversation.service";

export function ComposeRequest({
  recipientId,
  onCreated,
  onCancel,
}: {
  recipientId?: string;
  onCreated: (id: string, created: boolean) => void;
  onCancel: () => void;
}) {
  const submit = async (event: FormEvent) => {
    event.preventDefault();
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-auto p-5">
      <div className="mb-5 flex justify-between">
        <h2 className="text-lg font-semibold">Nuevo mensaje</h2>
        <button onClick={onCancel} className="text-sm underline">
          Cancelar
        </button>
      </div>
      <p className="mb-5 rounded-xl bg-orange-50 p-4 text-sm text-slate-700">
        Puedes contactar a personas de cualquier rol. Tu primer mensaje será una
        solicitud; para seguir hablando, la otra persona deberá aceptarla.
      </p>
      <form onSubmit={(event) => void submit(event)} className="mt-auto space-y-3">
        <button className="w-full rounded-xl bg-slate-900 p-3 text-sm font-semibold text-white">
          Enviar solicitud
        </button>
      </form>
    </section>
  );
}