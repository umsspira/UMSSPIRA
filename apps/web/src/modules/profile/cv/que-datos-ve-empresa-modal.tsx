'use client';

import { Check, X } from 'lucide-react';
import { useEffect } from 'react';

// Listas de la política de datos del postulante (T16.1, docs/epic5/politica-datos-postulante.md)
export const EMPRESA_VE = [
  'Nombre completo',
  'Correo',
  'Ubicación y nivel de experiencia',
  'Experiencia laboral, formación académica y certificaciones',
  'Habilidades, afinidad y desglose por requisito',
  'Etapa y fecha de postulación',
  'CV en PDF',
];

export const EMPRESA_NO_VE = [
  'Carnet de identidad',
  'Teléfono personal',
  'Fecha de nacimiento',
  'Dirección',
  'Respuestas de la encuesta de empleabilidad (condición laboral, cargo, salario)',
  'Otras postulaciones del titulado',
  'Datos de titulados que no postularon a su vacante',
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function QueDatosVeEmpresaModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cv-datos-titulo"
        className="max-h-full w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl sm:p-6"
      >
        <h3 id="cv-datos-titulo" className="text-lg font-semibold text-abyssal-blue">
          ¿Qué datos ve la empresa?
        </h3>

        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-abyssal-blue">La empresa ve</h4>
            <ul className="mt-2 space-y-2 text-sm text-abyssal-blue">
              {EMPRESA_VE.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-700" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-abyssal-blue">La empresa no ve</h4>
            <ul className="mt-2 space-y-2 text-sm text-abyssal-blue">
              {EMPRESA_NO_VE.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-burning-flame px-4 text-sm font-bold text-abyssal-blue hover:brightness-95 sm:w-auto"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
