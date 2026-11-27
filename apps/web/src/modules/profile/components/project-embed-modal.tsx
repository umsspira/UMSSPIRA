'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Loader2, X } from 'lucide-react';

import { canTryEmbed, EMBED_TIMEOUT_MS } from '@/modules/profile/utils/project-embed';

// Datos del proyecto que muestra la ventana; los llena la HU-19 al integrar
export type EmbeddedProject = {
  name: string;
  url: string;
  description?: string;
  technologies?: string[];
};

type ProjectEmbedModalProps = {
  project: EmbeddedProject;
  onClose: () => void;
};

type EmbedState = 'loading' | 'loaded' | 'blocked';

const secondaryButtonClassName =
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-truffle-trouble bg-white px-5 py-2.5 text-sm font-bold text-truffle-trouble transition hover:bg-palladian';
const primaryButtonClassName =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-burning-flame px-5 py-2.5 text-sm font-bold text-abyssal-blue transition hover:brightness-95';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

// Vista embebida de un proyecto (HU-20), con la misma estructura de ventana que el visor de respaldos
export function ProjectEmbedModal({ project, onClose }: ProjectEmbedModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // Un enlace que no es https o un sitio que nunca se deja mostrar va directo a la tarjeta (T20.2 y T20.3)
  const [embedState, setEmbedState] = useState<EmbedState>(() => (canTryEmbed(project.url) ? 'loading' : 'blocked'));

  // El navegador no avisa cuando bloquea un iframe (X-Frame-Options o CSP): si onLoad no llega a tiempo, se trata como bloqueado
  useEffect(() => {
    if (embedState !== 'loading') return undefined;
    const timer = window.setTimeout(() => setEmbedState('blocked'), EMBED_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [embedState]);

  // Esc cierra y Tab no sale de la ventana mientras está abierta
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Al abrir, el foco entra a la ventana
  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>('button')?.focus();
  }, []);

  return (
    // Clic en el fondo oscuro cierra; los clics dentro del cuadro no llegan aquí como target
    <div
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-abyssal-blue/50 p-2 sm:p-4"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={project.name}
        className="flex h-[calc(100dvh-1rem)] w-full max-w-[960px] flex-col rounded-2xl bg-white p-4 shadow-xl sm:h-[calc(100dvh-2rem)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="min-w-0 break-words text-base font-bold leading-snug text-blue-fantastic sm:text-lg">
            {project.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana del proyecto"
            className="shrink-0 rounded p-1 text-blue-fantastic transition hover:bg-palladian"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="relative mt-4 min-h-0 flex-1 overflow-hidden rounded-lg border border-oatmeal bg-palladian">
          {embedState === 'blocked' ? (
            <div role="alert" className="flex h-full flex-col items-center justify-center gap-4 overflow-y-auto px-4 py-8 text-center">
              <p className="text-sm font-semibold text-blue-fantastic">Este sitio no permite verse aquí.</p>
              {/* Tarjeta del proyecto */}
              <article className="w-full max-w-md break-words rounded-xl border border-oatmeal bg-white p-4 text-left">
                <h3 className="text-base font-bold text-blue-fantastic">{project.name}</h3>
                {project.description && (
                  <p className="mt-2 text-sm text-blue-fantastic/80">{project.description}</p>
                )}
                {project.technologies && project.technologies.length > 0 && (
                  <p className="mt-2 text-xs font-semibold text-truffle-trouble">{project.technologies.join(' · ')}</p>
                )}
                <p className="mt-2 text-xs text-blue-fantastic/70">{project.url}</p>
              </article>
            </div>
          ) : (
            <>
              {embedState === 'loading' && (
                <p
                  role="status"
                  className="absolute inset-0 flex items-center justify-center gap-2 bg-palladian text-sm font-medium text-blue-fantastic"
                >
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  Cargando…
                </p>
              )}
              <iframe
                src={project.url}
                title={`Sitio del proyecto ${project.name}`}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                referrerPolicy="no-referrer"
                onLoad={() => setEmbedState('loaded')}
                className="h-full w-full border-0 bg-white"
              />
            </>
          )}
        </div>

        {/* En celular los botones se reparten el ancho y nunca salen de la pantalla */}
        <div className="mt-4 grid shrink-0 grid-cols-2 gap-3 sm:flex sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButtonClassName}>
            Cerrar
          </button>
          <a href={project.url} target="_blank" rel="noopener noreferrer" className={primaryButtonClassName}>
            <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
            Abrir en una pestaña nueva
          </a>
        </div>
      </div>
    </div>
  );
}
