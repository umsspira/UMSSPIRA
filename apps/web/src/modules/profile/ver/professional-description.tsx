'use client';

import Link from 'next/link';
import { useState } from 'react';

import { completarSeccionHref } from '@/modules/profile/utils/profile-completeness';

// Largo a partir del cual la descripción se recorta a unas 3 líneas con «Leer más» (HU-21, T21.6).
// Un texto con más de 3 saltos de línea también se recorta aunque sea corto.
export const LARGO_DESCRIPCION_RECORTADA = 280;
const LINEAS_VISIBLES = 3;

export function isLongDescription(description: string): boolean {
  return description.length > LARGO_DESCRIPCION_RECORTADA || description.split('\n').length > LINEAS_VISIBLES;
}

// Un texto sin letras ni números (por ejemplo «.») se trata como vacío: mostrarlo parecía un error visual
export function hasDescriptionContent(description: string): boolean {
  return /[0-9A-Za-zÀ-ÖØ-öø-ÿ]/.test(description);
}

// Descripción profesional al inicio de la línea de tiempo del resumen (HU-07); vacía = estado vacío con acceso a completarla
export default function ProfessionalDescription({ description }: { description: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasContent = hasDescriptionContent(description);
  const isLong = isLongDescription(description);
  const isClamped = isLong && !isExpanded;

  return (
    <section aria-labelledby="professional-description-title" className="flex flex-col gap-3 pb-8">
      <h2
        id="professional-description-title"
        className="text-sm font-extrabold uppercase tracking-[0.2em] text-truffle-trouble"
      >
        Descripción profesional
      </h2>
      {hasContent ? (
        <>
          <p
            id="professional-description-text"
            className={`whitespace-pre-line break-words text-sm leading-[1.6] text-blue-fantastic/80${
              isClamped ? ' line-clamp-3' : ''
            }`}
          >
            {description}
          </p>
          {isLong && (
            <button
              type="button"
              aria-expanded={isExpanded}
              aria-controls="professional-description-text"
              onClick={() => setIsExpanded((value) => !value)}
              className="self-start text-sm font-semibold text-truffle-trouble underline-offset-2 hover:underline"
            >
              {isExpanded ? 'Leer menos' : 'Leer más'}
            </button>
          )}
        </>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-oatmeal bg-palladian/60 p-4">
          <p className="text-sm font-medium text-blue-fantastic/70">Aún no has agregado una descripción profesional</p>
          <Link
            href={completarSeccionHref('descripcion-profesional')}
            className="inline-flex items-center justify-center rounded-lg border border-abyssal-blue px-4 py-2 text-sm font-bold text-abyssal-blue transition hover:bg-abyssal-blue/5"
          >
            Agregar descripción
          </Link>
        </div>
      )}
    </section>
  );
}
