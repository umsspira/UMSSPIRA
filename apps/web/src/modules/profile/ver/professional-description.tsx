'use client';

import { useLayoutEffect, useRef, useState } from 'react';

// HU-21 (T21.4): la descripción se muestra en 3 líneas y «Leer más» aparece solo si el texto no cabe en ellas.
// Se mide en pantalla; donde no se puede medir (sin diseño, como en las pruebas) se usa el largo aproximado.
export const LARGO_DESCRIPCION_RECORTADA = 280;
const LINEAS_VISIBLES = 3;

export function isLongDescription(description: string): boolean {
  return description.length > LARGO_DESCRIPCION_RECORTADA || description.split('\n').length > LINEAS_VISIBLES;
}

// Descripción profesional al inicio de la línea de tiempo del resumen (HU-07); vacía = "Sin registros"
export default function ProfessionalDescription({ description }: { description: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isLong, setIsLong] = useState(() => isLongDescription(description));
  const isClamped = !isExpanded;

  // Con el texto recortado, si su alto real supera el visible es que hay más de 3 líneas; se vuelve a medir al cambiar el ancho
  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element || isExpanded) return undefined;
    const measure = () => {
      setIsLong(element.scrollHeight > 0 ? element.scrollHeight > element.clientHeight + 1 : isLongDescription(description));
    };
    measure();
    if (typeof ResizeObserver !== 'function') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [description, isExpanded]);

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
            ref={textRef}
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
