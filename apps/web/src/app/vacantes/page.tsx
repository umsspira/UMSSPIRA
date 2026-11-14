'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import VacancyAdminFooter from './components/VacancyAdminFooter';
import {
  getVacancyIdentifier,
  searchIndexedVacancies,
  type Vacancy,
} from '../../lib/api/vacantes';

function resultCountLabel(count: number) {
  return `${count} ${count === 1 ? 'vacante encontrada' : 'vacantes encontradas'}`;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

export default function VacantesPage() {
  const [query, setQuery] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setLoading(true);
      setError('');

      searchIndexedVacancies(query, controller.signal)
        .then(setVacancies)
        .catch((requestError: unknown) => {
          if (isAbortError(requestError)) return;
          setVacancies([]);
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'No se pudieron consultar las vacantes.',
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query, reloadKey]);

  const clearSearch = () => {
    setQuery('');
    setReloadKey((current) => current + 1);
  };

  return (
    <main className="flex min-h-[calc(100vh-84px)] flex-col bg-[#eee9df] text-[#1b2632]">
      <div className="mx-auto w-full max-w-[1440px] flex-1 px-5 pb-17 pt-6 sm:px-8 lg:px-14">
        <nav aria-label="Ruta de navegaci├│n" className="text-xs text-[#7a858d]">
          Bolsa de trabajo /{' '}
          <span aria-current="page" className="font-medium text-[#1b2632]">
            Vacantes disponibles
          </span>
        </nav>

        <h1 className="mt-5 text-3xl font-bold tracking-[-0.02em]">
          Vacantes disponibles
        </h1>
        <p className="mt-2 text-sm text-[#6e7880]">
          Consulta vacantes disponibles por cargo o identificador.
        </p>

        <section className="mt-20 rounded-[14px] border border-[#ddd6c8] bg-white px-5 py-3.5">
          <label htmlFor="vacancy-search" className="block text-[11px] font-semibold">
            Buscar por cargo o codigo
          </label>
          <input
            id="vacancy-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar por cargo o codigo"
            className="mt-2 h-[46px] w-full rounded-[7px] border border-[#ddd6c8] bg-white px-3.5 text-[13px] outline-none transition focus:border-[#ffb162]"
          />
        </section>

        <section
          aria-busy={loading}
          className="mt-5 min-h-[502px] rounded-2xl border border-[#ddd6c8] bg-white px-5 pb-7 pt-5 sm:px-7"
        >
          <h2 className="text-xl font-bold">Resultados</h2>
          <p className="mt-1.5 text-xs text-[#6e7880]">
            {loading ? 'Consultando vacantes...' : resultCountLabel(vacancies.length)}
          </p>

          {loading ? (
            <div className="mt-7 min-h-[238px] animate-pulse rounded-[14px] border border-[#ddd6c8] bg-[#f8f5ef] p-6">
              <div className="h-7 w-72 rounded bg-[#e8e2d7]" />
              <div className="mt-4 h-4 w-96 max-w-full rounded bg-[#e8e2d7]" />
              <span className="sr-only" role="status">Cargando vacantes</span>
            </div>
          ) : error ? (
            <div role="alert" className="mt-7 flex min-h-[300px] items-center justify-center rounded-[14px] border border-[#ddd6c8] bg-[#f8f5ef] px-6 text-center">
              <div>
                <h3 className="text-xl font-semibold">No pudimos cargar las vacantes</h3>
                <p className="mt-3 text-[13px] text-[#6e7880]">{error}</p>
                <button type="button" onClick={clearSearch} className="mt-7 h-11 rounded-[7px] border border-[#ddd6c8] bg-white px-8 text-[13px] font-semibold hover:bg-[#faf8f4]">
                  Intentar nuevamente
                </button>
              </div>
            </div>
          ) : vacancies.length === 0 ? (
            <div className="mt-7 flex min-h-[300px] items-center justify-center rounded-[14px] border border-[#ddd6c8] bg-[#f8f5ef] px-6 text-center">
              <div>
                <h3 className="text-xl font-semibold">No encontramos vacantes</h3>
                <p className="mt-4 text-[13px] text-[#6e7880]">
                  Prueba con otro cargo o codigo para volver a buscar.
                </p>
                <button type="button" onClick={clearSearch} className="mt-7 h-11 rounded-[7px] border border-[#ddd6c8] bg-white px-9 text-[13px] font-semibold hover:bg-[#faf8f4]">
                  Limpiar b├║squeda
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-7 space-y-4">
              {vacancies.map((vacancy) => {
                const identifier = getVacancyIdentifier(vacancy);
                return (
                  <article key={vacancy.id} className="relative min-h-[238px] rounded-[14px] border border-[#ddd6c8] bg-[#f8f5ef] px-4 pb-20 pt-16 sm:px-6 sm:pb-6">
                    <span className="absolute right-4 top-4 inline-flex h-[30px] min-w-[130px] items-center justify-center rounded-full bg-[#e7f3ed] px-5 text-[11px] font-bold text-[#2f7a5d] sm:right-6 sm:top-6">
                      {vacancy.estado}
                    </span>
                    <h3 className="text-2xl font-bold">{vacancy.titulo}</h3>
                    <p className="mt-2 text-[13px] font-medium text-[#6e7880]">
                      {identifier} ┬À {vacancy.empresa}
                    </p>
                    <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                      <p className="shrink-0 text-xs font-semibold">Requisitos principales</p>
                      <div className="flex flex-wrap gap-3">
                        {vacancy.requisitos.map((requirement) => (
                          <span key={requirement.id} className="inline-flex min-h-7 min-w-[116px] items-center justify-center rounded-full bg-[#eaf0f7] px-4 text-center text-[11px] font-bold text-[#2c3b4d]">
                            {requirement.nombre}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Link href={`/vacantes/${encodeURIComponent(vacancy.id)}`} className="absolute bottom-6 right-4 inline-flex h-11 min-w-[164px] items-center justify-center rounded-[7px] border border-[#ddd6c8] bg-white px-6 text-[13px] font-semibold hover:bg-[#faf8f4] sm:right-6">
                      Ver detalle
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
      <VacancyAdminFooter />
    </main>
  );
}
