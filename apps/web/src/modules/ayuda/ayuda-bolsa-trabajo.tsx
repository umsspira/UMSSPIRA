'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Button } from '@/shared/components/button';
import { cn } from '@/shared/utils/cn';

type HelpTab = 'titulado' | 'reclutador' | 'afinidad';

interface HelpStep {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  href: string;
}

const TABS: { id: HelpTab; label: string }[] = [
  { id: 'titulado', label: 'Titulado' },
  { id: 'reclutador', label: 'Reclutador' },
  { id: 'afinidad', label: 'Cómo funciona la afinidad' },
];

// Recortes del PDF oficial de HU20, páginas 20 y 21. Sustituir por capturas del despliegue.
const TITULADO_STEPS: HelpStep[] = [
  {
    title: 'Buscar una vacante',
    description: 'En Bolsa de trabajo, busca por cargo o empresa y abre «Ver oferta» para revisar una vacante.',
    image: '/ayuda/titulado-buscar-vacante.png',
    imageAlt: 'Listado de vacantes de la bolsa de trabajo con el buscador.',
    href: '/job-postings',
  },
  {
    title: 'Ver la afinidad',
    description: 'Consulta la columna «Afinidad» para ver cuánto coincide tu perfil con los requisitos de cada vacante.',
    image: '/ayuda/titulado-ver-afinidad.png',
    imageAlt: 'Listado de vacantes con el porcentaje de afinidad de cada una.',
    href: '/job-postings',
  },
  {
    title: 'Postularse',
    description: 'Elige una vacante, abre «Ver oferta» y pulsa «Postularme» en su detalle. Si falta información, completa tu perfil.',
    image: '/ayuda/titulado-postularse.png',
    imageAlt: 'Detalle de una oferta con el botón «Postularme».',
    // El listado abre /portal/empleos/{id} con el ID de la vacante elegida.
    href: '/job-postings',
  },
  {
    title: 'Subir el CV',
    description: 'En tu perfil, busca «Currículum (CV)» y selecciona «Subir CV». El archivo debe ser PDF y pesar hasta 5 MB.',
    image: '/ayuda/titulado-subir-cv.png',
    imageAlt: 'Perfil del titulado con la sección «Currículum (CV)» y el botón «Subir CV».',
    href: '/profile',
  },
];

const RECLUTADOR_STEPS: HelpStep[] = [
  {
    title: 'Publicar una vacante',
    description: 'Completa el formulario con los datos del puesto y sus requisitos; después, pulsa «Publicar vacante».',
    image: '/ayuda/reclutador-publicar-vacante.png',
    imageAlt: 'Formulario de publicación de una vacante con el botón «Publicar vacante».',
    href: '/empresa/vacantes/publicar',
  },
  {
    title: 'Ver los postulantes',
    description: 'En «Mis vacantes», elige una oferta y abre «Ver postulantes» para consultar sus candidatos.',
    image: '/ayuda/reclutador-ver-postulantes.png',
    imageAlt: '«Mis vacantes» con la acción «Ver postulantes».',
    href: '/empresa/mis-vacantes',
  },
  {
    title: 'Evaluar a un postulante',
    description: 'Elige una vacante, abre sus postulantes y pulsa «Ver detalle» para revisar el perfil y la información profesional.',
    image: '/ayuda/reclutador-evaluar-postulante.png',
    imageAlt: 'Lista de postulantes con su porcentaje de afinidad y la acción «Ver detalle».',
    href: '/empresa/mis-vacantes',
  },
  {
    title: 'Descargar el CV',
    description: 'En el detalle del postulante, pulsa «Descargar CV» si tiene un archivo disponible y tu empresa está autorizada.',
    image: '/ayuda/reclutador-descargar-cv.png',
    imageAlt: 'Detalle del postulante con el botón «Descargar CV».',
    href: '/empresa/mis-vacantes',
  },
];

function StepCards({ steps, audience }: { steps: HelpStep[]; audience: HelpTab }) {
  return (
    <ol className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {steps.map((step, index) => {
        const headingId = `ayuda-${audience}-paso-${index + 1}`;

        return (
          <li key={step.image} className="min-w-0">
            <article aria-labelledby={headingId} className="flex h-full min-w-0 flex-col rounded-2xl border border-oatmeal/60 bg-white p-3 shadow-sm sm:p-4">
              <figure>
                <a
                  href={step.image}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Ampliar imagen: ${step.title}`}
                  className="block overflow-hidden rounded-lg border border-oatmeal/60 focus-visible:outline-offset-4"
                >
                  <Image
                    src={step.image}
                    alt={step.imageAlt}
                    width={1365}
                    height={735}
                    sizes="(min-width: 1200px) 544px, (min-width: 768px) 46vw, 92vw"
                    className="h-auto w-full"
                  />
                </a>
              </figure>
              <h3 id={headingId} className="mt-4 text-base font-bold text-abyssal-blue sm:text-lg">
                {index + 1}. {step.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-blue-fantastic">{step.description}</p>
              <div className="mt-auto pt-4">
                <Link
                  href={step.href}
                  aria-describedby={headingId}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-blue-fantastic bg-white px-4 py-2 text-sm font-bold text-abyssal-blue transition-colors hover:bg-palladian focus-visible:outline-offset-4"
                >
                  Ir a la pantalla <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </article>
          </li>
        );
      })}
    </ol>
  );
}

export function AyudaBolsaTrabajo({
  initialTab = 'titulado',
  affinityContent,
}: {
  initialTab?: HelpTab;
  // T20.1 podrá aportar su contenido desde la página sin modificar este contenedor.
  affinityContent?: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<HelpTab>(initialTab);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let targetIndex: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        targetIndex = (index + 1) % TABS.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        targetIndex = (index + TABS.length - 1) % TABS.length;
        break;
      case 'Home':
        targetIndex = 0;
        break;
      case 'End':
        targetIndex = TABS.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    setActiveTab(TABS[targetIndex].id);
    tabRefs.current[targetIndex]?.focus();
  }

  return (
    <main className="min-h-screen min-w-0 bg-palladian px-4 py-6 text-abyssal-blue sm:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <header>
          <p className="text-xs font-bold uppercase tracking-widest text-truffle-trouble">Centro de ayuda</p>
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-4xl">Ayuda · Bolsa de trabajo</h1>
        </header>

        <div role="tablist" aria-label="Guías de la bolsa de trabajo" className="mt-5 flex flex-col gap-2 border-b border-oatmeal pb-5 sm:flex-row sm:flex-wrap">
          {TABS.map((tab, index) => (
            <Button
              key={tab.id}
              ref={(element) => { tabRefs.current[index] = element; }}
              type="button"
              role="tab"
              id={`ayuda-tab-${tab.id}`}
              aria-controls={`ayuda-panel-${tab.id}`}
              aria-selected={activeTab === tab.id}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => handleTabKey(event, index)}
              className={cn(
                'h-auto min-h-11 w-full whitespace-normal border px-4 py-3 sm:w-auto',
                activeTab === tab.id
                  ? 'border-abyssal-blue bg-abyssal-blue text-white hover:bg-abyssal-blue'
                  : 'border-oatmeal bg-white text-abyssal-blue hover:bg-oatmeal',
              )}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {TABS.map((tab) => (
          <section
            key={tab.id}
            role="tabpanel"
            id={`ayuda-panel-${tab.id}`}
            aria-labelledby={`ayuda-tab-${tab.id}`}
            hidden={activeTab !== tab.id}
            tabIndex={0}
            className="min-w-0 pt-5 focus-visible:outline-offset-4"
          >
            <h2 className="sr-only">{tab.label}</h2>
            {tab.id === 'titulado' && <StepCards steps={TITULADO_STEPS} audience={tab.id} />}
            {tab.id === 'reclutador' && <StepCards steps={RECLUTADOR_STEPS} audience={tab.id} />}
            {tab.id === 'afinidad' && (affinityContent ?? (
              <div className="rounded-2xl border border-oatmeal/60 bg-white p-5 sm:p-8">
                <h3 className="text-lg font-bold">Contenido de afinidad pendiente</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-fantastic">
                  Esta sección estará disponible cuando se incorpore la explicación oficial del cálculo de afinidad.
                </p>
              </div>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
