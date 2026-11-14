import type { SalaryRangeCount } from '../types/acreditacion.types';

const RANGES = ['0–2.999', '3.000–5.000', '5.001–8.000', '8.001–12.000', '12.001–21.000'];

export function AcreditacionSalaryBlock({ ranges }: { ranges: SalaryRangeCount[] }) {
  const counts = RANGES.map((range) => ({
    range,
    count: ranges.find((item) => item.range === range)?.count ?? 0,
  }));
  const max = Math.max(1, ...counts.map((item) => item.count));

  return (
    <section className="rounded-xl border border-oatmeal bg-white p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-abyssal-blue">Salario mensual</h2>
      <p className="mt-1 text-sm text-abyssal-blue/70">Titulados por rango, en Bs</p>
      <ul className="mt-4 space-y-3">
        {counts.map(({ range, count }) => (
          <li key={range}>
            <div className="flex items-center justify-between gap-2 text-sm text-abyssal-blue">
              <span>{range}</span>
              <span className="font-semibold">{count}</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-palladian">
              <div
                className="h-full rounded-full bg-truffle-trouble"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}