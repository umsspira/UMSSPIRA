'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useFetch } from '../../use-fetch';

type Oferta = {
  id: number;
  titulo: string;
  empresa?: string;
  ciudad?: string;
  modalidad?: string;
  afinidad: number;
};

const RESPONSABILIDADES = [
  'Desarrollar componentes e interfaces web con React y TypeScript.',
  'Implementar diseños adaptables a dispositivos móviles con Tailwind CSS.',
  'Integrar API REST y colaborar en revisiones de código con Git.',
  'Participar en pruebas y mejoras de accesibilidad junto al equipo.',
];
const COMPETENCIAS = [
  'React y TypeScript para el desarrollo de interfaces.',
  'Tailwind CSS y diseño responsive para la presentación visual.',
  'Git para el control de versiones.',
  'Consumo de API REST para integrar servicios.',
];

export default function DetallePage() {
  const { id } = useParams<{ id: string }>();
  const { data: o, loading, error } = useFetch<Oferta>(`/afinidad/oportunidades/${id}`);

  if (loading) return <main className="p-8">Cargando...</main>;
  if (error || !o) return <main className="p-8 text-red-600">No se pudo cargar: {error}</main>;

  return (
    <main className="min-h-screen bg-[#F3EFE6] px-6 py-8 text-[#1B2433]">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/bolsa-de-trabajo/oportunidades"
          className="inline-block rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm"
        >
          ← Bolsa de Trabajo
        </Link>

        <section className="mt-4 rounded-xl bg-[#1B2433] p-6 text-white">
          <p className="text-xs">{o.empresa}</p>
          <h1 className="mt-1 text-2xl font-bold">{o.titulo}</h1>
          <p className="mt-1 text-sm text-gray-300">
            {[o.ciudad, o.modalidad].filter(Boolean).join(' · ')}
          </p>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Bloque titulo="Responsabilidades" items={RESPONSABILIDADES} />
            <Bloque titulo="Competencias requeridas" items={COMPETENCIAS} />
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <p className="text-sm font-semibold">Tu afinidad con esta oferta</p>
              <p className="mt-2 text-4xl font-bold text-[#9C4A2F]">{o.afinidad} %</p>
              <div className="mt-3 h-2 rounded bg-gray-200">
                <div
                  className="h-2 rounded bg-[#F4B266]"
                  style={{ width: `${o.afinidad}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-gray-600">
                Estimación orientativa semántica ponderada. No garantiza la contratación.
              </p>
              <Link
                href={`/bolsa-de-trabajo/oportunidades/${o.id}/afinidad`}
                className="mt-4 block rounded-md border border-gray-300 py-2 text-center text-sm"
              >
                Ver comparación
              </Link>
            </div>
            <button className="w-full rounded-md bg-[#F4B266] py-2.5 text-sm font-semibold">
              Postular a la oferta
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Bloque({ titulo, items }: { titulo: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="font-semibold">{titulo}</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700 marker:text-[#9C4A2F]">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}