'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchVacancyOffer, type VacancyOffer } from '@/features/job-postings/my-applications.service';

function VacancyOfferPage() {
  const params = useParams<{ id: string }>();
  const [offer, setOffer] = useState<VacancyOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadOffer = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setOffer(await fetchVacancyOffer(params.id));
    } catch {
      setOffer(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void loadOffer();
  }, [loadOffer]);

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <Link href="/my-applications" className="text-sm font-semibold text-abyssal-blue hover:underline">
        Volver a mis postulaciones
      </Link>

      {loading ? (
        <p role="status" className="rounded-2xl border border-oatmeal bg-white p-8 text-center">
          Cargando la oferta…
        </p>
      ) : error || !offer ? (
        <section className="rounded-2xl border border-truffle-trouble/40 bg-white p-8 text-center">
          <p role="alert" className="font-medium text-truffle-trouble">
            No pudimos cargar el detalle de la oferta
          </p>
          <button
            type="button"
            onClick={() => void loadOffer()}
            className="mt-4 rounded-lg bg-abyssal-blue px-4 py-2 font-semibold text-white"
          >
            Reintentar
          </button>
        </section>
      ) : (
        <article className="space-y-5 rounded-2xl border border-oatmeal bg-white p-6 shadow-sm sm:p-8">
          <header>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-abyssal-blue">
                {offer.title || 'Vacante sin título'}
              </h1>
              {!offer.isAvailable && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  Vacante no disponible
                </span>
              )}
            </div>
            <p className="mt-2 text-slate-700">{offer.companyName || 'Empresa no disponible'}</p>
          </header>
          {offer.modality && <p><strong>Modalidad:</strong> {offer.modality}</p>}
          {offer.experienceLevel && <p><strong>Experiencia:</strong> {offer.experienceLevel}</p>}
          {offer.description && (
            <section>
              <h2 className="font-semibold text-abyssal-blue">Descripción</h2>
              <p className="mt-2 whitespace-pre-wrap text-slate-700">{offer.description}</p>
            </section>
          )}
        </article>
      )}
    </main>
  );
}

export default VacancyOfferPage;
