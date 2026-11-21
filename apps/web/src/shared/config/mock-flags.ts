/**
 * Épica 5 · HU-19: inventario de banderas de mock/demostración del frontend.
 * Cada bandera indica qué pantallas afecta y cuál debe ser su valor en producción.
 * Next solo sustituye `process.env.NEXT_PUBLIC_*` escritos de forma literal,
 * por eso cada bandera se lee con su nombre completo.
 */
export interface BanderaMock {
  nombre: string;
  /** Pantallas (rutas) que cambian de comportamiento con la bandera. */
  pantallas: string[];
  /** Valor esperado en el ambiente de demo/producción. */
  esperado: 'false';
  /** Valor efectivo en este build (la ausencia cuenta como false). */
  activa: boolean;
  nota: string;
}

export function leerBanderasMock(): BanderaMock[] {
  return [
    {
      nombre: 'NEXT_PUBLIC_USE_MOCK',
      pantallas: [
        '/empresa/mis-vacantes/[id]/candidatos',
        '/empresa/mis-vacantes/[id]/candidatos/[applicantId]',
      ],
      esperado: 'false',
      activa: process.env.NEXT_PUBLIC_USE_MOCK === 'true',
      nota: 'Postulantes de ejemplo en lugar de la API. Por defecto false.',
    },
    {
      nombre: 'NEXT_PUBLIC_USE_AFFINITY_MOCK',
      pantallas: ['/afinidad/egresado', '/afinidad/reclutador'],
      esperado: 'false',
      activa: process.env.NEXT_PUBLIC_USE_AFFINITY_MOCK === 'true',
      nota: 'Solo se honra con NODE_ENV=test; un build de Next siempre usa la API real.',
    },
    {
      nombre: 'NEXT_PUBLIC_ENABLE_SIMULATION_CONTROLS',
      pantallas: ['/afinidad/egresado'],
      esperado: 'false',
      activa: process.env.NEXT_PUBLIC_ENABLE_SIMULATION_CONTROLS === 'true',
      nota: 'Controles de simulación del radar; se ignora en builds de producción.',
    },
    {
      nombre: 'NEXT_PUBLIC_DEMO_MODE',
      pantallas: ['Barra de navegación de empresa (menú de empresa)', 'Cliente HTTP compartido (api-client)'],
      esperado: 'false',
      activa: process.env.NEXT_PUBLIC_DEMO_MODE === 'true',
      nota: 'Deploy de demostración sin exigir sesión. Debe estar en false.',
    },
  ];
}
