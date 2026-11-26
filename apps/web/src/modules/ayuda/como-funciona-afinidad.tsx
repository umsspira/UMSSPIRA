/**
 * Contenido de la pestaña «Cómo funciona la afinidad» de HU-20.
 * No consulta perfiles ni simula afinidad de usuarios reales.
 * Los ejemplos son didácticos y deben contrastarse con HU-10/HU-11 antes de la demo.
 */
const EJEMPLOS = [
  { requisitos: 'Node.js, PostgreSQL, Docker', habilidades: 'Java, MySQL', afinidad: '0 %' },
  { requisitos: 'Node.js, PostgreSQL, Docker', habilidades: 'Node.js, PostgreSQL', afinidad: '67 %' },
  { requisitos: 'Node.js, PostgreSQL, Docker', habilidades: 'Node.js, PostgreSQL, Docker', afinidad: '100 %' },
] as const;

/** Texto exacto del CA-07 de la HU-20. */
export const FORMULA_AFINIDAD = 'Afinidad = requisitos cumplidos ÷ total de requisitos';

/** Peso de la coincidencia parcial fijado por la HU-11 (MATCH_WEIGHTS del motor): 50 %. */
export const PESO_PARCIAL_HU11 = 50;

export function ComoFuncionaAfinidad({ pesoParcial = PESO_PARCIAL_HU11 }: { pesoParcial?: number }) {
  return (
    <div className="space-y-5">
      <section aria-labelledby="formula-afinidad" className="rounded-xl border border-[#E8E1D6] bg-white p-4 sm:p-5">
        <h2 id="formula-afinidad" className="text-base font-bold text-[#172238]">Fórmula</h2>
        <p className="mt-3 break-words rounded-lg bg-[#FFF0DD] p-3 text-sm font-semibold text-[#172238]">
          {FORMULA_AFINIDAD}
        </p>
        {/* Textos cortos como en el mock-up (bug 1 del QA); las etiquetas son las de la HU-11. */}
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm leading-6 text-slate-700">
          <li><strong>Exacta:</strong> suma el requisito completo.</li>
          <li><strong>Similar:</strong> suma {pesoParcial === 50 ? 'la mitad' : `el ${pesoParcial} %`} del requisito.</li>
          <li><strong>No encontrada:</strong> no suma.</li>
        </ul>
      </section>
      <section aria-labelledby="ejemplos-afinidad" className="rounded-xl border border-[#E8E1D6] bg-white p-4 sm:p-5">
        <h2 id="ejemplos-afinidad" className="text-base font-bold text-[#172238]">Ejemplos</h2>
        <div className="mt-3 space-y-3 sm:hidden">
          {EJEMPLOS.map((ejemplo) => (
            <div key={ejemplo.afinidad} className="space-y-1 rounded-lg border border-stone-200 bg-[#FAF8F3] p-3 text-sm">
              <p><strong>Requisitos de la vacante:</strong> {ejemplo.requisitos}</p>
              <p><strong>Habilidades del perfil:</strong> {ejemplo.habilidades}</p>
              <p><strong>Afinidad:</strong> {ejemplo.afinidad}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 hidden sm:block">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="bg-[#FAF8F3] text-slate-700">
              <tr>
                <th scope="col" className="w-2/5 p-3">Requisitos de la vacante</th>
                <th scope="col" className="w-2/5 p-3">Habilidades del perfil</th>
                <th scope="col" className="w-1/5 p-3">Afinidad</th>
              </tr>
            </thead>
            <tbody>
              {EJEMPLOS.map((ejemplo) => (
                <tr key={ejemplo.afinidad} className="border-b border-[#EEE9DF]">
                  <td className="break-words p-3">{ejemplo.requisitos}</td>
                  <td className="break-words p-3">{ejemplo.habilidades}</td>
                  <td className="p-3 font-semibold">{ejemplo.afinidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
