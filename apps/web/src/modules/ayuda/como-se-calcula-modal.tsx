'use client';

import { useEffect, useId, useRef } from 'react';

export type EstadoCoincidencia = 'exact' | 'similar' | 'not-found';

export interface DetalleRequisitoAfinidad {
  requirement: string;
  matchedSkill: string | null;
  result: EstadoCoincidencia;
  /** Aporte normalizado (0 a 1). La API no lo envía: sin él se usan los pesos de la HU-11. */
  weight?: number;
}

export interface ComoSeCalculaModalProps {
  open: boolean;
  onClose: () => void;
  percentage: number;
  comparison: readonly DetalleRequisitoAfinidad[];
}

/** Peso de la coincidencia parcial de la HU-11 (MATCH_WEIGHTS del motor). */
const PESO_PARCIAL = 0.5;

// Mismas etiquetas que el detalle de la vacante y el desglose de la empresa (HU-11)
const RESULTADOS: Record<EstadoCoincidencia, { texto: string; estilo: string }> = {
  exact: { texto: 'Exacta', estilo: 'bg-emerald-50 text-emerald-800' },
  similar: { texto: 'Similar', estilo: 'bg-amber-50 text-amber-900' },
  'not-found': { texto: 'No encontrada', estilo: 'bg-stone-100 text-stone-700' },
};

function porcentaje(valor: number): string {
  return Number.isFinite(valor)
    ? new Intl.NumberFormat('es-BO', { maximumFractionDigits: 2 }).format(valor)
    : 'No disponible';
}

// Texto de cuando los pesos de la HU-11 no explican el porcentaje recibido
const SIN_ECUACION = 'Afinidad informada por el motor:';

function detalleCalculo(
  porcentajeRecibido: number,
  comparison: readonly DetalleRequisitoAfinidad[],
): string {
  const total = comparison.length;
  if (total === 0) return 'No hay requisitos disponibles para explicar el cálculo.';

  const weightsValidos = comparison.every(
    (item) => typeof item.weight === 'number' && Number.isFinite(item.weight) &&
      item.weight >= 0 && item.weight <= 1,
  );

  if (weightsValidos) {
    const equivalentes = comparison.reduce((suma, item) => suma + (item.weight ?? 0), 0);
    const esperado = (equivalentes / total) * 100;
    // Nunca declarar una ecuación que contradiga el porcentaje recibido.
    if (Math.abs(esperado - porcentajeRecibido) <= 0.011) {
      return `${porcentaje(equivalentes)} de ${total} requisitos equivalentes = ${porcentaje(porcentajeRecibido)} %`;
    }
  }

  // La API no envía weight: se usan los pesos de la HU-11 (exacta 1, parcial 0,5, no encontrado 0).
  const exactos = comparison.filter((item) => item.result === 'exact').length;
  const parciales = comparison.filter((item) => item.result === 'similar').length;
  const esperado = ((exactos + parciales * PESO_PARCIAL) / total) * 100;
  // La API redondea a entero: se acepta la diferencia del redondeo.
  if (Math.abs(esperado - porcentajeRecibido) <= 0.51) {
    if (parciales === 0) {
      return `${exactos} de ${total} requisitos = ${porcentaje(porcentajeRecibido)} %`;
    }
    const exactasTexto = `${exactos} ${exactos === 1 ? 'exacta' : 'exactas'}`;
    const parcialesTexto = `${parciales} ${parciales === 1 ? 'parcial' : 'parciales'}`;
    return `${exactasTexto} + ${parcialesTexto} de ${total} requisitos = ${porcentaje(porcentajeRecibido)} %`;
  }

  return `${SIN_ECUACION} ${porcentaje(porcentajeRecibido)} %`;
}

export function ComoSeCalculaModal({
  open,
  onClose,
  percentage,
  comparison,
}: ComoSeCalculaModalProps) {
  const tituloId = useId();
  const descripcionId = useId();
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const dialogoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cerrarRef.current?.focus();

    function manejarTecla(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const elementos = dialogoRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])');
      if (!elementos?.length) return;
      const primero = elementos[0];
      const ultimo = elementos[elementos.length - 1];
      if (event.shiftKey && document.activeElement === primero) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener('keydown', manejarTecla);
    return () => {
      document.removeEventListener('keydown', manejarTecla);
      anterior?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  const detalle = detalleCalculo(percentage, comparison);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 sm:p-6">
      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descripcionId}
        className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl min-w-0 overflow-y-auto rounded-xl border border-[#E8E1D6] bg-white p-4 shadow-xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={tituloId} className="text-lg font-bold text-[#172238]">
            ¿Cómo se calcula?
          </h2>
          <button
            ref={cerrarRef}
            type="button"
            aria-label="Cerrar explicación"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl text-slate-700 hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500"
          >
            ×
          </button>
        </div>
        <p id={descripcionId} className="mt-2 text-sm leading-6 text-slate-600">
          Comparación de los requisitos de esta vacante con las habilidades registradas.
        </p>

        <div className="mt-4 space-y-2" aria-label="Desglose por requisito">
          {comparison.length === 0 ? (
            <p className="rounded-lg bg-stone-50 p-4 text-sm text-slate-600">
              El desglose por requisito todavía no está disponible.
            </p>
          ) : (
            comparison.map((item, index) => {
              const estado = RESULTADOS[item.result];
              return (
                <div key={`${item.requirement}-${index}`} className="grid min-w-0 gap-2 rounded-lg border border-[#EEE9DF] p-3 text-sm sm:grid-cols-[1fr_1fr_auto] sm:items-center">
                  <div className="min-w-0 break-words font-semibold text-[#172238]">{item.requirement}</div>
                  <div className="min-w-0 break-words text-slate-600">{item.matchedSkill ?? '—'}</div>
                  <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${estado.estilo}`}>
                    {estado.texto}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {detalle}
        </p>
        {/* La nota solo aparece cuando la ecuación con los pesos de la HU-11 no cuadra con el porcentaje recibido */}
        {detalle.startsWith(SIN_ECUACION) && comparison.some((item) => item.result === 'similar') && (
          <p className="mt-2 text-xs leading-5 text-slate-600">
            Las coincidencias parciales pueden tener un peso distinto. Se muestra el porcentaje recibido del motor; no se recalcula aquí.
          </p>
        )}
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg bg-[#F7A95B] px-5 py-2 font-semibold text-[#172238] hover:bg-[#F2A04D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#172238]"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
