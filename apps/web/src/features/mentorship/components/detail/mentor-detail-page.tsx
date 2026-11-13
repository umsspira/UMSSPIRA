'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import { useMentorDetail } from '../../hooks/use-mentor-detail';
import { MentorDetailHeader } from './mentor-detail-header';
import { MentorDetailInfo } from './mentor-detail-info';
import { MentorDetailAvailability } from './mentor-detail-availability';
import {
  MentorDetailError,
  MentorDetailNotFound,
  MentorDetailSessionRedirect,
  MentorDetailSkeleton,
} from './mentor-detail-states';

export function MentorDetailPage({ mentorId }: { mentorId: string }) {
  const { mentor, loading, error, notFound, invalidId, sessionRequired, retry } =
    useMentorDetail(mentorId);

  // La barra de Mentorías la aporta el layout del módulo; esta vista no agrega otra.
  return (
    <main className="mentorship-shell mentor-detail-shell">
      {/* Perfil no encontrado o enlace no válido (Mockup 5: sin breadcrumbs ni título) */}
      {sessionRequired ? (
        <MentorDetailSessionRedirect />
      ) : invalidId ? (
        <MentorDetailNotFound reason="invalid" />
      ) : notFound ? (
        <MentorDetailNotFound />
      ) : error ? (
        <MentorDetailError onRetry={retry} />
      ) : (
        <>
          {/* Barra superior con título y botón para regresar al directorio */}
          <header className="mentor-detail-page-header">
            <h1 className="mentor-detail-page-heading">Perfil del mentor</h1>
            <div className="mentor-detail-back-action">
              <Link
                href="/mentorship/directory"
                className="mentor-button mentor-button-secondary"
                aria-label="Volver al directorio de mentores"
              >
                <ArrowLeftIcon className="icon" aria-hidden="true" />
                Volver al directorio
              </Link>
            </div>
          </header>

          {loading || !mentor ? (
            <MentorDetailSkeleton />
          ) : (
            <div className="mentor-detail-content">
              {/* Tarjeta de cabecera del mentor */}
              <MentorDetailHeader mentor={mentor} />

              {/* Contenido en dos columnas: izquierda información, derecha disponibilidad */}
              <div className="mentor-detail-layout">
                <MentorDetailInfo mentor={mentor} />
                <MentorDetailAvailability mentor={mentor} />
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
