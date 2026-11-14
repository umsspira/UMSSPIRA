'use client';

import { Pencil } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import DownloadProfileButton from '@/modules/profile/components/download-profile-button';
import AffinityLinkCard from '@/modules/profile/ver/affinity-link-card';
import ProfessionalDescription from '@/modules/profile/ver/professional-description';
import ProfileCompleteness from '@/modules/profile/ver/profile-completeness';
import ProjectsSection from '@/modules/profile/ver/projects-section';
import SavedNotice from '@/modules/profile/ver/saved-notice';
import { useProfileStore } from '@/modules/profile/state/profile-store';
import type { ProjectRecord } from '@/modules/profile/types/profile-record';
import { isProfileEmpty, profileCompleteness } from '@/modules/profile/utils/profile-completeness';
import { recordsToTimeline } from '@/modules/profile/utils/records-to-timeline';
import { sortSectionsByRecency } from '@/modules/profile/utils/sort-by-recency';
import Timeline from '@/shared/components/timeline';

// Resumen del perfil (HU-03) con la descarga en JSON (HU-05), leyendo el estado compartido del perfil
export default function ProfileSummary({ showSavedNotice = false }: { showSavedNotice?: boolean }) {
  const { header, records, description, isLoading, loadError, retryLoad } = useProfileStore();
  const router = useRouter();
  const [isSavedNoticeOpen, setIsSavedNoticeOpen] = useState(showSavedNotice);
  // HU-12: solo se redirige cuando la carga terminó bien; con error se queda para mostrar «Reintentar»
  const shouldComplete = !isLoading && !loadError && isProfileEmpty(records, description);

  useEffect(() => {
    if (shouldComplete) {
      // replace: «Atrás» no vuelve al resumen vacío
      router.replace('/profile/completar');
    }
  }, [shouldComplete, router]);
  const timeline = recordsToTimeline(records);

  const experiences = records.experience.length;
  // HU-21 (T21.5) y HU-19 (T19.6): completitud de 5 secciones (formación, experiencia, certificaciones,
  // descripción y proyectos); los proyectos vienen en records.project
  const completeness = profileCompleteness(records, description);
  // Carrera y promoción solo si la API las tiene registradas
  const careerLine = [header?.career, header?.graduationYear ? `Promoción ${header.graduationYear}` : '']
    .filter(Boolean)
    .join(' · ');

  if (isLoading || shouldComplete) {
  return <p role="status">Cargando tu perfil…</p>;
}

if (loadError) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3">
      <p>No se pudo cargar tu perfil. {loadError}</p>
      <button
        type="button"
        onClick={retryLoad}
        className="rounded-lg bg-burning-flame px-4 py-2 font-bold text-abyssal-blue"
      >
        Reintentar
      </button>
    </div>
  );
}

  return (
    <div className="flex flex-col gap-8">
      {isSavedNoticeOpen && (
        <SavedNotice
          onClose={() => {
            setIsSavedNoticeOpen(false);
            // Quita ?guardado=1 para que el aviso no vuelva al recargar
            router.replace('/profile');
          }}
        />
      )}
      {/* Cabecera del perfil */}
      <header className="flex flex-col gap-6 rounded-2xl border border-abyssal-blue/10 bg-white px-5 py-6 md:flex-row md:items-end md:justify-between md:px-8 md:py-7">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-sm font-bold uppercase tracking-[0.1em] text-truffle-trouble">
            Perfil profesional
          </p>
          <h1 className="text-[28px] font-bold leading-tight text-blue-fantastic md:text-[40px]">
            {header?.name || 'Mi perfil'}
          </h1>
          {careerLine && (
            <p className="text-base font-medium text-blue-fantastic/80 md:text-lg">{careerLine}</p>
          )}
        </div>

        {/* Acciones del perfil */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {/* "Editar perfil" lleva a Gestionar registros (HU-04) */}
          <Link
            href="/profile/records"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-burning-flame px-6 py-3.5 text-sm font-bold text-abyssal-blue transition hover:brightness-95"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Editar perfil
          </Link>
          {header && <DownloadProfileButton header={header} records={records} />}
        </div>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Columna izquierda: resumen (solo escritorio) y acceso a la afinidad (Épica 3) */}
        <div className="flex w-full shrink-0 flex-col gap-6 lg:w-[300px]">
          <aside className="flex w-full flex-col gap-4 rounded-2xl border border-abyssal-blue/10 bg-white p-6">
            <h2 className="text-xl font-bold text-blue-fantastic">Resumen del Perfil</h2>
            <p className="text-[13px] leading-[1.5] text-blue-fantastic/70">
              Este es el resumen digital de tu trayectoria académica y laboral registrada en la UMSS.
            </p>
            <ul className="flex flex-col gap-3 border-t border-oatmeal pt-4 text-xs font-semibold text-blue-fantastic">
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-truffle-trouble" aria-hidden="true" />
                {experiences} Experiencias registradas
              </li>
            </ul>
          </aside>
          <ProfileCompleteness completeness={completeness} />
          <AffinityLinkCard />
        </div>

        {/* Línea de tiempo, con la descripción profesional al inicio */}
        <section className="min-w-0 flex-1 rounded-2xl border border-abyssal-blue/10 bg-white px-4 py-5 md:px-7 md:py-6">
          <ProfessionalDescription description={description} />
          <Timeline sections={sortSectionsByRecency(timeline)} />
          <ProjectsSection projects={records.project as ProjectRecord[]} />
        </section>
      </div>
    </div>
  );
}
