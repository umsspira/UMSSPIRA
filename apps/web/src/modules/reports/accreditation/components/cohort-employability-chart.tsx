export interface CohortEmployabilityData {
  cohort: string | number;
  responses: number;
  employed: number;
}

interface CohortEmployabilityChartProps {
  cohorts: CohortEmployabilityData[];
}

const MINIMUM_RESPONSES = 5;

function calculateEmployabilityRate({
  responses,
  employed,
}: CohortEmployabilityData): number {
  if (responses <= 0) return 0;

  const rate = (employed / responses) * 100;

  return Math.min(100, Math.max(0, Math.round(rate)));
}

/**
 * Task 1.4 — Gráfico "Empleabilidad por cohorte".
 *
 * CA-03:
 * Las cohortes con al menos 5 respuestas muestran su porcentaje
 * mediante una barra vertical.
 *
 * CA-04:
 * Las cohortes con entre 1 y 4 respuestas muestran
 * "Sin datos suficientes" en lugar de la barra y el porcentaje.
 *
 * Implementación sin dependencias externas de gráficos.
 */
export function CohortEmployabilityChart({
  cohorts,
}: CohortEmployabilityChartProps) {
  if (cohorts.length === 0) {
    return (
      <section
        aria-labelledby="cohort-employability-heading"
        className="rounded-xl border border-oatmeal bg-white p-5"
      >
        <h3
          id="cohort-employability-heading"
          className="font-semibold text-abyssal-blue"
        >
          Empleabilidad por cohorte
        </h3>

        <p className="mt-2 text-sm text-abyssal-blue/70">
          Porcentaje de titulados empleados por cohorte
        </p>

        <p className="mt-6 text-sm text-abyssal-blue/70">
          No hay información de cohortes disponible.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="cohort-employability-heading"
      className="rounded-xl border border-oatmeal bg-white p-5"
    >
      <h3
        id="cohort-employability-heading"
        className="font-semibold text-abyssal-blue"
      >
        Empleabilidad por cohorte
      </h3>

      <p className="mt-2 text-sm text-abyssal-blue/70">
        Porcentaje de titulados empleados por cohorte
      </p>

      <div
        className="mt-8 grid items-end gap-2"
        style={{
          gridTemplateColumns: `repeat(${cohorts.length}, minmax(0, 1fr))`,
        }}
      >
        {cohorts.map((cohort) => {
          const hasEnoughResponses =
            cohort.responses >= MINIMUM_RESPONSES;

          const employabilityRate =
            calculateEmployabilityRate(cohort);

          return (
            <div
              key={String(cohort.cohort)}
              data-testid={`employability-cohort-${cohort.cohort}`}
              className="flex min-w-0 flex-col items-center"
            >
              {hasEnoughResponses ? (
                // El porcentaje va justo encima de su barra, como en el mock-up 01 (CA-03);
                // pt-6 deja espacio para el texto cuando la barra llega al 100 %.
                <div
                  className="flex h-44 w-full items-end justify-center pt-6"
                  role="img"
                  aria-label={`Cohorte ${cohort.cohort}: ${employabilityRate} % de empleabilidad`}
                >
                  <div
                    data-testid={`employability-bar-${cohort.cohort}`}
                    className="relative w-8 rounded-t-sm bg-abyssal-blue sm:w-12"
                    style={{
                      height: `${employabilityRate}%`,
                    }}
                  >
                    <span
                      data-testid={`employability-percentage-${cohort.cohort}`}
                      className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-abyssal-blue sm:text-sm"
                    >
                      {employabilityRate} %
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex h-44 w-full items-end justify-center">
                  <div
                    data-testid={`insufficient-data-${cohort.cohort}`}
                    className="mb-1 rounded-md border border-truffle-trouble/40 bg-truffle-trouble/10 px-2 py-2 text-center text-[10px] leading-tight text-truffle-trouble sm:text-xs"
                  >
                    Sin datos suficientes
                  </div>
                </div>
              )}

              <p className="mt-3 text-xs font-medium text-abyssal-blue sm:text-sm">
                {cohort.cohort}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}