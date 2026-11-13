'use client';

import { useState } from 'react';

// Largo a partir del cual la descripción se recorta a unas 3 líneas con «Leer más» (HU-21, T21.6).
// Un texto con más de 3 saltos de línea también se recorta aunque sea corto.
export const LARGO_DESCRIPCION_RECORTADA = 280;
const LINEAS_VISIBLES = 3;

export function isLongDescription(description: string): boolean {
  return description.length > LARGO_DESCRIPCION_RECORTADA || description.split('\n').length > LINEAS_VISIBLES;
}

// Descripción profesional al inicio de la línea de tiempo del resumen (HU-07); vacía = "Sin registros"
export default function ProfessionalDescription({ description }: { description: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
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
      {description ? (
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
        <p className="text-sm font-medium text-blue-fantastic/60">Sin registros</p>
      )}
    </section>
  );
}
