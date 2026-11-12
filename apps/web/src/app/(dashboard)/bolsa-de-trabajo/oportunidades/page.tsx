'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useFetch } from '../use-fetch';

type Oferta = {
  id: number;
  titulo: string;
  empresa?: string;
  ciudad?: string;
  modalidad?: string;
  afinidad: number;
};

export default function OportunidadesPage() {
  const { data, loading, error } = useFetch<Oferta[]>('/afinidad/oportunidades');
  const [q, setQ] = useState('');

  const lista = (data ?? []).filter((o) =>
    `${o.titulo} ${o.empresa ?? ''}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <main className="min-h-screen bg-[#F3EFE6] px-6 py-8 text-[#1B2433]">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs text-[#9C4A2F]">Bolsa de trabajo / Oportunidades</p>
        <h1 className="mt-2 text-2xl font-bold">Oportunidades para ti</h1>
        <p className="text-sm text-gray-600">
          Compara tu perfil con cada vacante y encuentra dónde puedes aportar.
        </p>

        <div className="mt-5 flex gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por título, habilidad o empresa"
            className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          />
          <button className="rounded-md bg-[#F4B266] px-5 py-2 text-sm font-semibold">
            Buscar
          </button>
        </div>

        <div className="mt-4 rounded-md border border-[#F4B266] bg-[#FDF1E3] p-3 text-sm">
          <b>Una orientación personalizada, no una decisión de selección</b>
          <p className="text-xs text-gray-600">
            La afinidad de 0 a 100 % compara habilidades y requisitos con tu perfil actual.
            Puedes revisar cualquier vacante, incluso con una afinidad baja.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
          <section className="space-y-4">
            <p className="text-xs font-semibold">{lista.length} oportunidades</p>
            {loading && <p>Cargando...</p>}
            {error && <p className="text-red-600">No se pudo cargar: {error}</p>}
            {lista.map((o) => (
              <article key={o.id} className="rounded-lg border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold">{o.titulo}</h2>
                    <p className="text-xs text-gray-600">
                      {[o.empresa, o.ciudad].filter(Boolean).join(' · ')}
                    </p>
                    {o.modalidad && <p className="text-xs text-gray-500">{o.modalidad}</p>}
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-[#9C4A2F]">{o.afinidad} %</span>
                    <p className="text-[10px] text-gray-500">Afinidad calculada</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end border-t pt-3">
                  <Link
                    href={`/bolsa-de-trabajo/oportunidades/${o.id}`}
                    className="rounded-md border border-gray-300 px-4 py-1.5 text-sm"
                  >
                    Ver detalle
                  </Link>
                </div>
              </article>
            ))}
          </section>

          <aside className="h-fit rounded-lg border border-gray-200 bg-white p-5 text-sm">
            <h3 className="font-semibold">Tu perfil profesional</h3>
            <span className="mt-2 inline-block rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
              Datos suficientes
            </span>
            <p className="mt-3 font-semibold">María Fernández</p>
            <p className="text-xs text-gray-600">Ingeniería de Sistemas · UMSS</p>
            <p className="mt-3 border-t pt-3 text-xs text-gray-700">
              React · TypeScript · Git · API REST · SQL · Colaboración en equipos ágiles
            </p>
            <button className="mt-4 w-full rounded-md border border-gray-300 py-1.5">
              Actualizar perfil
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}