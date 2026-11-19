import {
  descriptionWithoutRequirements,
  extractTechnicalRequirements,
  mergeTechnicalRequirements,
} from './job-posting-requirements';

describe('job posting requirements from description', () => {
  const description = [
    'Buscamos una persona para el equipo de datos.',
    '',
    '**Conocimientos técnicos requeridos:**',
    '- Manejo de Microsoft Excel o Google Sheets.',
    '- Conocimientos de SQL.',
    '- Fundamentos de estadística descriptiva.',
    '- Manejo básico de Python y bibliotecas como Pandas.',
    '- Conocimientos de Power BI o Tableau.',
    '- Capacidad para interpretar y visualizar información.',
    '',
    '**Responsabilidades:**',
    '- Preparar informes.',
  ].join('\n');

  it('extrae únicamente las viñetas de conocimientos técnicos', () => {
    expect(extractTechnicalRequirements(description)).toEqual([
      'Manejo de Microsoft Excel o Google Sheets.',
      'Conocimientos de SQL.',
      'Fundamentos de estadística descriptiva.',
      'Manejo básico de Python y bibliotecas como Pandas.',
      'Conocimientos de Power BI o Tableau.',
      'Capacidad para interpretar y visualizar información.',
    ]);
  });

  it('preserves sections after requirements', () => {
    const withoutRequirements = descriptionWithoutRequirements(description);
    expect(withoutRequirements).toContain('Buscamos una persona para el equipo de datos.');
    expect(withoutRequirements).toContain('**Responsabilidades:**');
    expect(withoutRequirements).toContain('- Preparar informes.');
  });
  it('no inventa requisitos cuando falta el encabezado y combina sin duplicar los guardados', () => {
    expect(extractTechnicalRequirements('Se requiere experiencia con SQL.')).toEqual([]);
    expect(mergeTechnicalRequirements(description, [
      { id: 'stored-1', nombre: 'CONOCIMIENTOS DE SQL' },
    ])).toHaveLength(6);
  });
});
