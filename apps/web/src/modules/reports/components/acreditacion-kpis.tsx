interface AcreditacionKpisProps {
  totalResponses: number;
  employedPercent: number;
  averageInsertionMonths: number | null;
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-oatmeal bg-white p-4">
      <p className="text-sm text-abyssal-blue/70">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold text-abyssal-blue">{value}</p>
      {hint && <p className="mt-1 text-xs text-abyssal-blue/60">{hint}</p>}
    </div>
  );
}

export function AcreditacionKpis({
  totalResponses,
  employedPercent,
  averageInsertionMonths,
}: AcreditacionKpisProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Kpi label="Total de respuestas" value={String(totalResponses)} />
      <Kpi
        label="Titulados empleados"
        value={`${Math.round(employedPercent)} %`}
        hint="Sobre el total de respuestas"
      />
      <Kpi
        label="Tiempo promedio de inserción"
        value={
          averageInsertionMonths === null
            ? 'Sin datos'
            : `${averageInsertionMonths.toFixed(1)} meses`
        }
        hint="Solo de los que trabajan"
      />
    </div>
  );
}