'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import VacancyAdminFooter from '../components/VacancyAdminFooter';
import {
  getVacancy,
  getVacancyIdentifier,
  type Vacancy,
} from '../../../lib/api/vacantes';

type Props = { id: string };

export default function DetalleVacanteCliente({ id }: Props) {
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getVacancy(id)
      .then((result) => {
        if (active) setVacancy(result);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setVacancy(null);
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudo cargar la vacante.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="flex min-h-[calc(100vh-84px)] flex-col bg-[#eee9df] text-[#1b2632]">
        <div className="mx-auto w-full max-w-[1440px] flex-1 px-5 pb-17 pt-6 sm:px-8 lg:px-14">
          <p role="status" className="text-sm text-[#6e7880]">Cargando detalle de la vacante...</p>
          <div className="mt-24 min-h-[620px] animate-pulse rounded-2xl border border-[#ddd6c8] bg-white p-7">
            <div className="h-6 w-64 rounded bg-[#e8e2d7]" />
          </div>
        </div>
        <VacancyAdminFooter />
      </main>
    );
  }

  if (error || !vacancy) {
    return (
      <main className="flex min-h-[calc(100vh-84px)] flex-col bg-[#eee9df] text-[#1b2632]">
        <div className="mx-auto flex w-full max-w-[1440px] flex-1 items-center justify-center px-5 py-12 sm:px-8 lg:px-14">
          <section role="alert" className="w-full max-w-2xl rounded-2xl border border-[#ddd6c8] bg-white p-10 text-center">
            <h1 className="text-2xl font-bold">No se pudo cargar la vacante</h1>
            <p className="mt-3 text-sm text-[#6e7880]">{error || 'La vacante no existe.'}</p>
            <Link href="/vacantes" className="mt-7 inline-flex h-11 items-center justify-center rounded-[7px] border border-[#ddd6c8] bg-white px-7 text-[13px] font-semibold hover:bg-[#faf8f4]">
              Volver a vacantes
            </Link>
          </section>
        </div>
        <VacancyAdminFooter />
      </main>
    );
  }

  const identifier = getVacancyIdentifier(vacancy);

  return (
    <main className="flex min-h-[calc(100vh-84px)] flex-col bg-[#eee9df] text-[#1b2632]">
      <div className="mx-auto w-full max-w-[1440px] flex-1 px-5 pb-17 pt-6 sm:px-8 lg:px-14">
        <nav aria-label="Ruta de navegación" className="flex flex-wrap items-center gap-1 text-xs text-[#7a858d]">
          <span>Bolsa de trabajo</span>
          <span aria-hidden="true">/</span>
          <Link href="/vacantes" className="hover:text-[#1b2632]">Vacantes disponibles</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="font-medium text-[#1b2632]">{vacancy.titulo}</span>
        </nav>

        <h1 className="mt-5 text-3xl font-bold tracking-[-0.02em]">{vacancy.titulo}</h1>
        <p className="mt-2 text-sm text-[#6e7880]">
          Código {identifier} · {vacancy.empresa}
        </p>

        <article className="mt-20 flex min-h-[620px] flex-col rounded-2xl border border-[#ddd6c8] bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Datos de la vacante</h2>
              <p className="mt-4 text-sm text-[#6e7880]">
                Código: {identifier} · Empresa: {vacancy.empresa} · Estado: {vacancy.estado}
              </p>
            </div>
            <span className="inline-flex h-[30px] min-w-[130px] items-center justify-center rounded-full bg-[#e7f3ed] px-5 text-[11px] font-bold text-[#2f7a5d]">
              {vacancy.estado}
            </span>
          </div>

          <section className="mt-8">
            <h2 className="text-lg font-bold">Requisitos principales</h2>
            {vacancy.requisitos.length > 0 ? (
              <div className="mt-5 grid max-w-[590px] gap-3 sm:grid-cols-2 sm:gap-x-[30px]">
                {vacancy.requisitos.map((requirement) => (
                  <span key={requirement.id} className="inline-flex min-h-[30px] items-center justify-center rounded-full bg-[#eaf0f7] px-5 text-center text-[11px] font-bold text-[#2c3b4d]">
                    {requirement.nombre}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm text-[#6e7880]">No hay requisitos registrados para esta vacante.</p>
            )}
          </section>

          <div className="mt-auto flex flex-col gap-3 pt-8 sm:flex-row">
            <Link
              href={`/vacantes/${encodeURIComponent(vacancy.id)}/editar`}
              className="inline-flex h-11 items-center justify-center rounded-[7px] bg-[#ffb162] px-6 text-[13px] font-semibold text-[#1b2632] hover:bg-[#f2a455]"
            >
              Editar vacante
            </Link>
            <Link href="/vacantes" className="inline-flex h-11 items-center justify-center rounded-[7px] border border-[#ddd6c8] bg-white px-6 text-[13px] font-semibold hover:bg-[#faf8f4]">
              Volver a vacantes
            </Link>
          </div>
        </article>
      </div>
      <VacancyAdminFooter />
    </main>
  );
}
