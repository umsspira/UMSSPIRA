export interface EmploymentCohortData {
  cohort: string | number;
  responses: number;
  employed: number;
}

interface EmploymentByCohortChartProps {
  cohorts: EmploymentCohortData[];
}

const MINIMUM_RESPONSES = 5;

function calculateEmploymentRate({
  responses,
  employed,
}: EmploymentCohortData): number {
  if (responses <= 0) return 0;

  const rate = (employed / responses) * 100;

  return Math.min(100, Math.max(0, Math.round(rate)));
}

/**
 * Task 1.4 — Gráfico "Empleabilidad por cohorte".
 *
 * CA-03:
 * Las cohortes con al menos 5 respuestas muestran su porcentaje
 * de empleabilidad mediante una barra.
 *
 * CA-04:
 * Las cohortes con entre 1 y 4 respuestas muestran
 * "Sin datos suficientes" en lugar de una barra.
 *
 * Sin dependencias externas de gráficos.
 */
export function EmploymentByCohortChart({
  cohorts,
}: EmploymentByCohortChartProps) {
  if (cohorts.length === 0) {
    return (
      <section
        aria-labelledby="employment-by-cohort-heading"
        className="rounded-lg border border-oatmeal bg-white p-5"
      >
        <h3
          id="employment-by-cohort-heading"
          className="font-semibold text-abyssal-blue"
        >
          Empleabilidad por cohorte
        </h3>

        <p className="mt-4 text-sm text-abyssal-blue/70">
          No hay información de cohortes disponible.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="employment-by-cohort-heading"
      className="rounded-lg border border-oatmeal bg-white p-5"
    >
      <div>
        <h3
          id="employment-by-cohort-heading"
          className="font-semibold text-abyssal-blue"
        >
          Empleabilidad por cohorte
        </h3>

        <p className="mt-1 text-sm text-abyssal-blue/70">
          Porcentaje de titulados que trabajan según su cohorte de egreso.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        {cohorts.map((cohort) => {
          const hasEnoughResponses =
            cohort.responses >= MINIMUM_RESPONSES;

          const employmentRate = calculateEmploymentRate(cohort);

          return (
            <div
              key={String(cohort.cohort)}
              data-testid={`employment-cohort-${cohort.cohort}`}
              className="grid gap-2 sm:grid-cols-[5rem_minmax(0,1fr)_5rem] sm:items-center"
            >
              <div>
                <p className="font-medium text-abyssal-blue">
                  {cohort.cohort}
                </p>

                <p className="text-xs text-abyssal-blue/60">
                  {cohort.responses}{' '}
                  {cohort.responses === 1 ? 'respuesta' : 'respuestas'}
                </p>
              </div>

              {hasEnoughResponses ? (
                <>
                  <div
                    className="h-7 overflow-hidden rounded-md bg-palladian"
                    role="img"
                    aria-label={`Cohorte ${cohort.cohort}: ${employmentRate}% de empleabilidad`}
                  >
                    <div
                      data-testid={`employment-bar-${cohort.cohort}`}
                      className="h-full rounded-md bg-abyssal-blue transition-[width]"
                      style={{ width: `${employmentRate}%` }}
                    />
                  </div>

                  <p className="text-right text-sm font-semibold text-abyssal-blue">
                    {employmentRate}%
                  </p>
                </>
              ) : (
                <div className="sm:col-span-2">
                  <p
                    data-testid={`insufficient-data-${cohort.cohort}`}
                    className="rounded-md border border-oatmeal bg-palladian px-3 py-2 text-sm text-abyssal-blue/70"
                  >
                    Sin datos suficientes
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}