'use client';

import { Check, Circle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getVacancy, type Vacancy } from '../../../../lib/api/vacantes';
import VacancyAdminFooter from '../../components/VacancyAdminFooter';

function formatSavedAt(value: string | null) {
  if (!value) return 'Fecha no disponible';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';

  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function ConfirmacionVacanteCliente({ id }: { id: string }) {
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getVacancy(id)
      .then((data) => {
        if (active) setVacancy(data);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'No se pudo consultar la vacante guardada.',
          );
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (error) {
    return (
      <main className="min-h-[calc(100vh-84px)] bg-[#eee9df] px-5 py-12 sm:px-8">
        <section className="mx-auto max-w-2xl rounded-2xl border border-[#ddd6c8] bg-white p-8 text-center">
          <h1 className="text-2xl font-bold text-[#1b2632]">
            No se pudo confirmar el guardado
          </h1>
          <p role="alert" className="mt-3 text-sm text-[#6e7880]">
            {error}
          </p>
          <Link
            href="/mis-vacantes"
            className="mt-6 inline-flex rounded-lg bg-[#ffb162] px-5 py-3 text-sm font-semibold text-[#1b2632]"
          >
            Ir a Mis vacantes
          </Link>
        </section>
      </main>
    );
  }

  if (!vacancy) {
    return (
      <main className="min-h-[calc(100vh-84px)] bg-[#eee9df] px-5 py-12 sm:px-8">
        <p className="mx-auto max-w-[1328px] text-sm text-[#6e7880]" role="status">
          Confirmando la información guardada...
        </p>
      </main>
    );
  }

  return (
    <div className="min-h-[calc(100vh-84px)] bg-[#eee9df] text-[#1b2632]">
      <main className="mx-auto max-w-[1440px] px-5 pb-16 pt-6 sm:px-8 lg:px-14">
        <nav aria-label="Ruta de navegación" className="text-xs text-[#7a858d]">
          <Link href="/mis-vacantes" className="hover:underline">
            Mis vacantes
          </Link>{' '}
          / Nueva vacante /{' '}
          <span className="font-medium text-[#1b2632]">Confirmación</span>
        </nav>

        <header className="mt-7">
          <h1 className="text-3xl font-bold tracking-tight">Vacante guardada</h1>
          <p className="mt-2 text-sm text-[#6e7880]">
            La información de la oportunidad se guardó correctamente.
          </p>
        </header>

        <section className="mt-14 flex min-h-[68px] items-center gap-4 rounded-[10px] border border-[#2f7a5d] bg-[#e7f3ed] px-5 text-[#2f7a5d]">
          <Check size={20} strokeWidth={3} aria-hidden="true" />
          <div>
            <h2 className="text-sm font-bold">Vacante guardada correctamente</h2>
            <p className="mt-1 text-[11px] font-medium">
              La información de “{vacancy.titulo}” quedó registrada y puede consultarse nuevamente.
            </p>
          </div>
        </section>

        <div className="mt-6 grid gap-7 lg:grid-cols-[minmax(0,900px)_minmax(300px,400px)]">
          <section className="rounded-2xl border border-[#ddd6c8] bg-white p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-bold">Resumen de la vacante</h2>
              <span className="min-w-32 rounded-full bg-[#e7f3ed] px-5 py-2 text-center text-[11px] font-bold text-[#2f7a5d]">
                Guardada
              </span>
            </div>

            <dl className="mt-7 grid gap-6 sm:grid-cols-2">
              <div>
                <dt className="mb-2 text-[11px] font-semibold">Identificador</dt>
                <dd className="break-all rounded-lg border border-[#ddd6c8] bg-[#f8f5ef] px-3.5 py-3.5 text-[13px]">
                  {vacancy.id}
                </dd>
              </div>
              <div>
                <dt className="mb-2 text-[11px] font-semibold">Cargo</dt>
                <dd className="rounded-lg border border-[#ddd6c8] bg-[#f8f5ef] px-3.5 py-3.5 text-[13px]">
                  {vacancy.titulo}
                </dd>
              </div>
              <div>
                <dt className="mb-2 text-[11px] font-semibold">Empresa</dt>
                <dd className="rounded-lg border border-[#ddd6c8] bg-[#f8f5ef] px-3.5 py-3.5 text-[13px]">
                  {vacancy.empresa}
                </dd>
              </div>
              <div>
                <dt className="mb-2 text-[11px] font-semibold">Estado</dt>
                <dd className="rounded-lg border border-[#ddd6c8] bg-[#f8f5ef] px-3.5 py-3.5 text-[13px]">
                  {vacancy.estado}
                </dd>
              </div>
            </dl>

            <div className="mt-8">
              <h3 className="text-[13px] font-semibold">Requisitos técnicos</h3>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {vacancy.requisitos.map((requirement) => (
                  <li
                    key={requirement.id}
                    className="rounded-full bg-[#eaf0f7] px-4 py-2 text-center text-[11px] font-bold text-[#2c3b4d]"
                  >
                    {requirement.nombre}
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-8 border-t border-[#ddd6c8] pt-5 text-xs font-medium text-[#6e7880]">
              Último guardado: {formatSavedAt(vacancy.fechaCreacion)}
            </p>
          </section>

          <aside className="flex min-h-[420px] flex-col rounded-2xl bg-[#2c3b4d] p-7 text-white lg:min-h-[528px]">
            <h2 className="text-xl font-bold">¿Qué puede hacer ahora?</h2>
            <p className="mt-3 text-xs text-[#c9c1b1]">
              Consulta o revisa la información de esta vacante.
            </p>
            <ul className="mt-10 space-y-6 text-xs text-[#c9c1b1]">
              {[
                'Volver a Mis vacantes',
                'Consultar la información guardada',
                'Revisar requisitos',
              ].map((label) => (
                <li key={label} className="flex items-center gap-3">
                  <Circle size={10} fill="#2f9b72" strokeWidth={0} />
                  {label}
                </li>
              ))}
            </ul>
            <div className="mt-auto space-y-3 pt-10">
              <Link
                href={`/vacantes/${encodeURIComponent(vacancy.id)}`}
                className="flex min-h-11 items-center justify-center rounded-lg bg-[#ffb162] px-4 text-[13px] font-semibold text-[#1b2632] hover:bg-[#f2a455]"
              >
                Editar vacante
              </Link>
              <Link
                href={`/mis-vacantes?guardada=${encodeURIComponent(vacancy.id)}`}
                className="flex min-h-11 items-center justify-center rounded-lg border border-[#ddd6c8] bg-white px-4 text-[13px] font-semibold text-[#1b2632] hover:bg-[#f8f5ef]"
              >
                Ir a Mis vacantes
              </Link>
            </div>
          </aside>
        </div>
      </main>
      <VacancyAdminFooter />
    </div>
  );
}
