'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useFetch } from '../../../use-fetch';

type Requisito = {
  requisito: string;
  habilidad: string | null;
  tipo: 'exacta' | 'similar' | 'no_encontrada';
  detalle: string;
};
type Resultado = {
  oferta: {
    id: number;
    titulo: string;
    empresa?: string;
    ciudad?: string;
    modalidad?: string;
    afinidad: number;
  };
  requisitos: Requisito[];
  perfil?: string[];
};

const BADGE = {
  exacta: { txt: 'Exacta', cls: 'bg-green-100 text-green-800' },
  similar: { txt: 'Similar · NLP', cls: 'bg-blue-100 text-blue-800' },
  no_encontrada: { txt: 'No encontrada', cls: 'bg-orange-100 text-orange-800' },
};

export default function ResultadosPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error } = useFetch<Resultado>(
    `/afinidad/oportunidades/${id}/resultados`,
  );

  if (loading) return <main className="p-8">Cargando...</main>;
  if (error || !data) return <main className="p-8 text-red-600">No se pudo cargar: {error}</main>;

  const { oferta, requisitos, perfil = [] } = data;
  const n = (t: Requisito['tipo']) => requisitos.filter((r) => r.tipo === t).length;

  return (
    <main className="min-h-screen bg-[#F3EFE6] px-6 py-8 text-[#1B2433]">
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/bolsa-de-trabajo/oportunidades/${oferta.id}`}
          className="inline-block rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm"
        >
          ← Volver a la oferta
        </Link>
        <h1 className="mt-4 text-3xl font-bold">Resultados de afinidad</h1>
        <p className="text-sm text-gray-600">
          Conoce cómo se relacionan tus habilidades con esta oportunidad.
        </p>

        <div className="mt-4 rounded-lg bg-[#EAE5DA] p-4">
          <p className="font-semibold">{oferta.titulo}</p>
          <p className="text-xs text-gray-600">
            {[oferta.empresa, oferta.ciudad, oferta.modalidad].filter(Boolean).join(' · ')}
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <section>
            <h2 className="font-semibold">Tu perfil frente a los requisitos</h2>
            <p className="text-xs text-gray-600">
              Se comparan los {requisitos.length} requisitos de esta oferta. Un término similar
              es una señal semántica, no una certificación.
            </p>
            <div className="mt-2 flex gap-2 text-xs">
              <span className="rounded bg-green-100 px-2 py-0.5 text-green-800">{n('exacta')} exactas</span>
              <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-800">{n('similar')} similares · NLP</span>
              <span className="rounded bg-orange-100 px-2 py-0.5 text-orange-800">{n('no_encontrada')} no encontradas</span>
            </div>

            <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#EAE5DA] text-xs">
                  <tr>
                    <th className="p-3">Requisito de la oferta</th>
                    <th className="p-3">Habilidad de tu perfil</th>
                    <th className="p-3">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {requisitos.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-4 text-gray-500">
                        Esta oferta aún no tiene comparación disponible.
                      </td>
                    </tr>
                  )}
                  {requisitos.map((r) => (
                    <tr key={r.requisito} className="border-t">
                      <td className="p-3 font-medium">{r.requisito}</td>
                      <td className="p-3">
                        <p>{r.habilidad ?? 'Sin evidencia en el perfil'}</p>
                        <p className="text-xs text-gray-500">{r.detalle}</p>
                      </td>
                      <td className="p-3">
                        <span className={`rounded px-2 py-0.5 text-xs ${BADGE[r.tipo].cls}`}>
                          {BADGE[r.tipo].txt}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              "No encontrada" significa que no hay evidencia en el perfil; no que carezcas de la habilidad.
            </p>

            <div className="mt-4 rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="font-semibold">Habilidades de tu perfil</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {perfil.map((p) => (
                  <span key={p} className="rounded-full bg-gray-100 px-3 py-1 text-xs">
                    {p}
                  </span>
                ))}
              </div>
              <button className="mt-4 rounded-md border border-gray-300 px-4 py-1.5 text-sm">
                Actualizar habilidades
              </button>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <p className="text-sm font-semibold">Tu afinidad con esta oferta</p>
              <p className="mt-2 text-4xl font-bold text-[#9C4A2F]">{oferta.afinidad} %</p>
              <div className="mt-3 h-2 rounded bg-gray-200">
                <div className="h-2 rounded bg-[#F4B266]" style={{ width: `${oferta.afinidad}%` }} />
              </div>
              <p className="mt-3 text-xs text-gray-600">
                Estimación orientativa semántica ponderada. No garantiza la contratación.
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm">
              <h3 className="font-semibold">¿Cómo se estima la afinidad?</h3>
              <ol className="mt-3 space-y-2 text-xs text-gray-700">
                <li><b>1. Se revisan los datos:</b> habilidades de tu perfil y requisitos de la vacante.</li>
                <li><b>2. Se compara el significado:</b> NLP identifica coincidencias y términos similares.</li>
                <li><b>3. Se pondera la relevancia:</b> la importancia de cada requisito influye en la estimación.</li>
              </ol>
            </div>

            <div className="rounded-lg border border-[#F4B266] bg-[#FDF1E3] p-5 text-sm">
              <h3 className="font-semibold">Tu siguiente paso</h3>
              <p className="mt-2 text-xs text-gray-700">
                Revisa los requisitos no encontrados. Si ya los utilizas, añádelos a tus habilidades
                con información precisa.
              </p>
              <button className="mt-4 w-full rounded-md bg-[#F4B266] py-2 font-semibold">
                Postular a la oferta
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}