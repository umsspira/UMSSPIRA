

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Application = {
  id: string;
  code: string;
  vacancyId: string;
  vacancyTitle: string;
  company: string;
  applicantName: string;
  email: string;
  submittedAt: string;
  status: string;
};

export default function MisPostulacionesPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('umsspira-postulaciones');

      if (saved) {
        const parsed: unknown = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setApplications(parsed as Application[]);
        }
      }
    } catch (error) {
      console.error('Error al cargar las postulaciones:', error);
    } finally {
      setLoaded(true);
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#f1eee4] px-5 py-10">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-8 flex flex-wrap gap-3">
          <Link
            href="/vacantes"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
          >
            Ver vacantes
          </Link>

          <Link
            href="/postulaciones"
            className="rounded-lg bg-orange-400 px-4 py-2 font-semibold text-white"
          >
            Mis postulaciones
          </Link>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900">
          Mis postulaciones
        </h1>

        <p className="mb-8 mt-2 text-gray-600">
          Aquí puedes consultar tus postulaciones y sus códigos de seguimiento.
        </p>

        {!loaded ? (
          <p className="text-gray-600">Cargando postulaciones...</p>
        ) : applications.length === 0 ? (
          <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-gray-800">
              Aún no tienes postulaciones
            </h2>

            <p className="mb-5 mt-2 text-gray-600">
              Cuando envíes una postulación, aparecerá aquí.
            </p>

            <Link
              href="/vacantes"
              className="inline-block rounded-lg bg-orange-400 px-5 py-3 font-semibold text-white hover:bg-orange-500"
            >
              Explorar vacantes
            </Link>
          </section>
        ) : (
          <div className="space-y-5">
            {applications.map((application, index) => (
              <article
                key={application.id || `${application.code}-${index}`}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {application.vacancyTitle}
                    </h2>

                    <p className="mt-1 text-gray-600">
                      {application.company}
                    </p>
                  </div>

                  <span className="h-fit w-fit rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                    {application.status || 'Postulación enviada'}
                  </span>
                </div>

                <div className="mt-5 space-y-2 text-sm text-gray-600">
                  <p>
                    <strong className="text-gray-800">Código:</strong>{' '}
                    {application.code}
                  </p>

                  <p>
                    <strong className="text-gray-800">Postulante:</strong>{' '}
                    {application.applicantName}
                  </p>

                  <p>
                    <strong className="text-gray-800">Correo:</strong>{' '}
                    {application.email}
                  </p>

                  <p>
                    <strong className="text-gray-800">Fecha de envío:</strong>{' '}
                    {application.submittedAt
                      ? new Date(application.submittedAt).toLocaleString()
                      : 'No disponible'}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
