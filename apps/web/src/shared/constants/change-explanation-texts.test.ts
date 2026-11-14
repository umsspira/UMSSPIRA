import {
  formatSignedPercentagePoints,
  getChangeExplanation,
  getFirstCalculationExplanation,
  type ChangeExplanationInput,
} from './change-explanation-texts';

const baseInput: ChangeExplanationInput = {
  areaLabel: 'Cloud/DevOps',
  previousAffinity: 0,
  affinity: 35,
  cause: 'profile',
  changes: [
    { keyword: 'AWS', percentagePoints: 25 },
    { keyword: 'Solutions Architect', percentagePoints: 10 },
  ],
};

function getAllCopyText(input: ChangeExplanationInput): string {
  const copy = getChangeExplanation(input);

  return [
    copy.summary,
    copy.contributionIntro ?? '',
    ...copy.contributions.map(
      (contribution) => `${contribution.keyword} ${contribution.points}`,
    ),
  ].join(' ');
}

function hasEmoji(text: string): boolean {
  return Array.from(text).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return (
      (codePoint >= 0x1f300 && codePoint <= 0x1faff) ||
      (codePoint >= 0x1f900 && codePoint <= 0x1f9ff)
    );
  });
}

describe('textos de la explicación de cambios', () => {
  it('describe un aumento con el porcentaje anterior, el actual y los aportes con signo', () => {
    const copy = getChangeExplanation(baseInput);

    expect(copy.variant).toBe('increase');
    expect(copy.summary).toBe('Cloud/DevOps aumentó de 0 % a 35 %.');
    expect(copy.contributionIntro).toBe('En el cálculo actual:');
    expect(copy.contributions).toEqual([
      { keyword: 'AWS', points: '+25 puntos porcentuales' },
      { keyword: 'Solutions Architect', points: '+10 puntos porcentuales' },
    ]);
  });

  it('describe una disminución e identifica solo los aportes que bajaron', () => {
    const copy = getChangeExplanation({
      areaLabel: 'Cloud/DevOps',
      previousAffinity: 40,
      affinity: 25,
      cause: 'profile',
      changes: [
        { keyword: 'Docker', percentagePoints: -10 },
        { keyword: 'Kubernetes', percentagePoints: -5 },
        { keyword: 'AWS', percentagePoints: 3 },
      ],
    });

    expect(copy.variant).toBe('decrease');
    expect(copy.summary).toBe('Cloud/DevOps disminuyó de 40 % a 25 %.');
    expect(copy.contributionIntro).toBe('Los aportes que bajaron son:');
    expect(copy.contributions).toEqual([
      { keyword: 'Docker', points: '\u221210 puntos porcentuales' },
      { keyword: 'Kubernetes', points: '\u22125 puntos porcentuales' },
    ]);
  });

  it('usa un texto propio cuando los enteros mostrados no cambian', () => {
    const copy = getChangeExplanation({
      areaLabel: 'Cloud/DevOps',
      previousAffinity: 49.6,
      affinity: 50.4,
      cause: 'profile',
      changes: [
        { keyword: 'AWS', percentagePoints: 0.8 },
        { keyword: 'Docker', percentagePoints: -0.8 },
      ],
    });

    expect(copy.variant).toBe('no-visible-change');
    expect(copy.summary).toContain('se mantiene en 50 %');
    expect(copy.summary).toContain('No hay una variación visible');
    expect(copy.summary).not.toMatch(/aument|disminuy|subi|baj/i);
    expect(copy.contributions).toHaveLength(0);
  });

  it('muestra solo aportes actuales en el primer cálculo, sin comparación', () => {
    const copy = getChangeExplanation({
      areaLabel: 'Cloud/DevOps',
      previousAffinity: null,
      affinity: 35,
      changes: [],
      currentContributions: [
        { keyword: 'AWS', percentagePoints: 25 },
        { keyword: 'Solutions Architect', percentagePoints: 10 },
      ],
    });

    expect(copy.variant).toBe('first-calculation');
    expect(copy.summary).toBe('Primer cálculo de Cloud/DevOps: 35 %.');
    expect(copy.contributionIntro).toBe('Aportes actuales:');
    expect(copy.contributions).toEqual([
      { keyword: 'AWS', points: '25 puntos porcentuales' },
      { keyword: 'Solutions Architect', points: '10 puntos porcentuales' },
    ]);
    expect(getAllCopyText({
      ...baseInput,
      previousAffinity: null,
      changes: [],
      currentContributions: [{ keyword: 'AWS', percentagePoints: 25 }],
    })).not.toMatch(/anterior|comparación|comparacion|variación|variacion/i);
  });

  it('identifica la actualización del algoritmo como causa sin atribuirla al perfil', () => {
    const copy = getChangeExplanation({
      ...baseInput,
      previousAffinity: 10,
      affinity: 35,
      cause: 'algorithm',
    });

    expect(copy.variant).toBe('system-update');
    expect(copy.summary).toContain('actualización del algoritmo de cálculo');
    expect(copy.summary).not.toMatch(/perfil/i);
  });

  it('identifica la actualización del diccionario como causa sin atribuirla al perfil', () => {
    const copy = getChangeExplanation({
      ...baseInput,
      previousAffinity: 10,
      affinity: 35,
      cause: 'dictionary',
    });

    expect(copy.variant).toBe('system-update');
    expect(copy.summary).toContain('actualización del diccionario de palabras clave');
    expect(copy.summary).not.toMatch(/perfil/i);
  });

  it('conserva todas las contribuciones cuando hay más de cinco cambios', () => {
    const copy = getFirstCalculationExplanation({
      areaLabel: 'Desarrollo de Software',
      previousAffinity: null,
      affinity: 100,
      currentContributions: Array.from({ length: 7 }, (_, index) => ({
        keyword: `keyword-${index + 1}`,
        percentagePoints: 10,
      })),
    });

    expect(copy.contributions).toHaveLength(7);
    expect(copy.contributions[6].keyword).toBe('keyword-7');
  });

  it('no cita campos fuera del motor ni incluye emojis', () => {
    const texts = [
      getAllCopyText(baseInput),
      getAllCopyText({ ...baseInput, previousAffinity: 40, affinity: 20 }),
      getAllCopyText({ ...baseInput, previousAffinity: 50, affinity: 50 }),
      getAllCopyText({
        ...baseInput,
        previousAffinity: null,
        currentContributions: [{ keyword: 'AWS', percentagePoints: 25 }],
      }),
      getAllCopyText({ ...baseInput, cause: 'algorithm', previousAffinity: 10 }),
      getAllCopyText({ ...baseInput, cause: 'dictionary', previousAffinity: 10 }),
    ];

    texts.forEach((text) => {
      expect(text).not.toMatch(/año|grado|jpg|pdf/i);
      expect(text).not.toMatch(/\bCV\b/i);
      expect(text).not.toMatch(/foto|mentoría|mentoria|habilidades|proyectos/i);
      expect(text).not.toMatch(/validación|validacion|certific|competencia/i);
      expect(hasEmoji(text)).toBe(false);
    });
  });
});

describe('formatSignedPercentagePoints', () => {
  it('formatea signos, decimales y singular', () => {
    expect(formatSignedPercentagePoints(25)).toBe('+25 puntos porcentuales');
    expect(formatSignedPercentagePoints(-10)).toBe('\u221210 puntos porcentuales');
    expect(formatSignedPercentagePoints(1)).toBe('+1 punto porcentual');
    expect(formatSignedPercentagePoints(2.5)).toBe('+2,5 puntos porcentuales');
    expect(formatSignedPercentagePoints(0)).toBe('0 puntos porcentuales');
  });
});
