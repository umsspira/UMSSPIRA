import type { ReactNode } from 'react';

interface AcreditacionHeaderProps {
  careerName: string;
  actions?: ReactNode;
}

export function AcreditacionHeader({ careerName, actions }: AcreditacionHeaderProps) {
  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-xl border border-oatmeal bg-white p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-abyssal-blue">Tablero de acreditación</h2>
        <p className="mt-1 text-sm text-abyssal-blue/70">
          Indicadores de la encuesta de empleabilidad
        </p>
        <p className="mt-3 text-sm font-semibold text-abyssal-blue">Carrera: {careerName}</p>
      </div>
      {actions ? <div className="min-w-0 sm:shrink-0">{actions}</div> : null}
    </section>
  );
}