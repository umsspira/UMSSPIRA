import { AFFINITY_AREA_SHORT_LABELS, AFFINITY_AREAS } from '@umsspira/shared-types/src/affinity';

import { clampPercentage, formatPercentage } from '@/shared/utils/percentage';

// HU-17: mini radar PROVISIONAL. El componente real lo entrega la Épica 3 (su T12.5);
// para cambiarlo solo se reemplaza este archivo, porque la tarjeta únicamente le pasa "values".

// Medidas del dibujo en unidades del viewBox (no en píxeles): el SVG se escala al ancho disponible
const SIZE = 200;
const CENTER = SIZE / 2;
const RADIUS = 72;
const GRID_LEVELS = [25, 50, 75, 100];

// Punto (x, y) de un eje: "value" va de 0 a 100 e "index" de 0 a 5 (el eje 0 apunta hacia arriba)
function getPoint(value: number, index: number) {
  const angle = ((Math.PI * 2) / AFFINITY_AREAS.length) * index - Math.PI / 2;
  const distance = (value / 100) * RADIUS;
  return { x: CENTER + distance * Math.cos(angle), y: CENTER + distance * Math.sin(angle) };
}

// Convierte un valor por eje en el texto "x,y x,y ..." que pide <polygon>
function toPolygonPoints(values: number[]) {
  return values
    .map((value, index) => {
      const { x, y } = getPoint(value, index);
      return `${x},${y}`;
    })
    .join(' ');
}

export interface MiniRadarPlaceholderProps {
  // 6 porcentajes (0 a 100) en el orden de AFFINITY_AREAS
  values: number[];
}

export default function MiniRadarPlaceholder({ values }: MiniRadarPlaceholderProps) {
  // Siempre 6 valores enteros entre 0 y 100; si falta uno vale 0
  const safeValues = AFFINITY_AREAS.map((_, index) => clampPercentage(values[index] ?? 0));
  const summary = AFFINITY_AREAS.map(
    (area, index) => `${AFFINITY_AREA_SHORT_LABELS[area]} ${formatPercentage(safeValues[index])}`,
  ).join(', ');

  return (
    <figure data-testid="mini-radar" className="flex w-full flex-col items-center gap-4">
      {/* aspect-square + viewBox: el radar cambia de tamaño sin deformarse (CA-06) */}
      <svg
        role="img"
        aria-label={`Mini radar de afinidad: ${summary}`}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="aspect-square w-full max-w-[200px]"
      >
        {GRID_LEVELS.map((level) => (
          <polygon
            key={level}
            points={toPolygonPoints(AFFINITY_AREAS.map(() => level))}
            className="fill-none stroke-oatmeal"
          />
        ))}
        {AFFINITY_AREAS.map((area, index) => {
          const edge = getPoint(100, index);
          return <line key={area} x1={CENTER} y1={CENTER} x2={edge.x} y2={edge.y} className="stroke-oatmeal" />;
        })}
        <polygon
          points={toPolygonPoints(safeValues)}
          strokeWidth={2}
          className="fill-burning-flame/40 stroke-truffle-trouble"
        />
        {safeValues.map((value, index) => {
          const vertex = getPoint(value, index);
          return (
            <circle
              key={AFFINITY_AREAS[index]}
              cx={vertex.x}
              cy={vertex.y}
              r={3}
              strokeWidth={2}
              className="fill-white stroke-truffle-trouble"
            />
          );
        })}
        {AFFINITY_AREAS.map((area, index) => {
          const label = getPoint(122, index);
          return (
            <text
              key={area}
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={12}
              className="fill-blue-fantastic font-bold"
            >
              {index + 1}
            </text>
          );
        })}
      </svg>

      {/* Leyenda: cada número del radar con su área. aria-hidden porque el SVG ya la lee en su aria-label */}
      <ol
        aria-hidden="true"
        className="grid w-full grid-cols-1 gap-x-6 gap-y-1.5 text-xs text-blue-fantastic sm:grid-cols-2 lg:grid-cols-1"
      >
        {AFFINITY_AREAS.map((area, index) => (
          <li key={area} className="flex items-center justify-between gap-2">
            <span>
              {index + 1}. {AFFINITY_AREA_SHORT_LABELS[area]}
            </span>
            <span className="font-bold">{formatPercentage(safeValues[index])}</span>
          </li>
        ))}
      </ol>
    </figure>
  );
}