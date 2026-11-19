import type { SalaryRangeCount } from '../types/acreditacion.types';

const RANGES = ['0–2.999', '3.000–5.000', '5.001–8.000', '8.001–12.000', '12.001–21.000'];

export function AcreditacionSalaryBlock({ ranges }: { ranges: SalaryRangeCount[] }) {
  const counts = RANGES.map((range) => ({
    range,
    count: ranges.find((item) => item.range === range)?.count ?? 0,
  }));
  const max = Math.max(1, ...counts.map((item) => item.count));

  return (
    <section className="min-w-0 rounded-xl border border-oatmeal bg-white p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-abyssal-blue">Salario mensual</h2>
      <p className="mt-1 text-sm text-abyssal-blue/70">Cantidad de titulados por rango (Bs)</p>
      <ul className="mt-4 space-y-3">
        {counts.map(({ range, count }) => (
          <li key={range} className="flex items-center gap-3 text-sm text-abyssal-blue">
            <span className="w-28 shrink-0">{range}</span>
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-palladian">
              <div
                className="h-full rounded-full bg-burning-flame"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right font-semibold">{count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}