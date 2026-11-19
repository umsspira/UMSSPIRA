// apps/web/src/features/chat/components/ComposeRequest.tsx
"use client";
import { useEffect, useState, type FormEvent } from "react";
import {
  searchChatContacts,
  type ChatContact,
} from "@/shared/services/chat-conversation.service";

export function ComposeRequest({
  recipientId,
  onCreated,
  onCancel,
}: {
  recipientId?: string;
  onCreated: (id: string, created: boolean) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selected, setSelected] = useState<ChatContact | null>(
    recipientId
      ? { id: recipientId, name: "Contacto seleccionado", role: "" }
      : null,
  );
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      void searchChatContacts(query, page)
        .then((result) => {
          if (active) {
            setContacts((current) =>
              page === 1 ? result.items : [...current, ...result.items],
            );
            setHasMore(result.hasMore);
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, page]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    void onCreated;
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
      <label htmlFor="chat-contact-search" className="mb-2 text-sm font-medium">
        Buscar una persona
      </label>
      <input
        id="chat-contact-search"
        value={query}
        onChange={(event) => {
          setPage(1);
          setQuery(event.target.value);
        }}
        placeholder="Buscar por nombre"
        maxLength={100}
        className="rounded-xl border p-3 text-sm"
      />
      <div className="my-3 max-h-48 shrink-0 overflow-auto rounded-xl border">
        {contacts.map((contact) => (
          <button
            key={contact.id}
            onClick={() => setSelected(contact)}
            className={`block w-full border-b p-3 text-left text-sm hover:bg-orange-50 ${selected?.id === contact.id ? "bg-orange-100" : ""}`}
          >
            <strong>{contact.name}</strong>
            <span className="ml-2 text-xs capitalize text-slate-500">
              {contact.role}
            </span>
          </button>
        ))}
        {loading && (
          <p role="status" className="p-3 text-sm">
            Buscando…
          </p>
        )}
        {!loading && !contacts.length && (
          <p className="p-3 text-sm text-slate-500">
            No se encontraron personas.
          </p>
        )}
        {hasMore && (
          <button
            disabled={loading}
            onClick={() => setPage((value) => value + 1)}
            className="w-full p-3 text-sm underline"
          >
            Ver más personas
          </button>
        )}
      </div>
      <form onSubmit={(event) => void submit(event)} className="mt-auto space-y-3">
        {selected && (
          <p className="text-sm">
            Para: <strong>{selected.name}</strong>
          </p>
        )}
        <button className="w-full rounded-xl bg-slate-900 p-3 text-sm font-semibold text-white">
          Enviar solicitud
        </button>
      </form>
    </section>
  );
}