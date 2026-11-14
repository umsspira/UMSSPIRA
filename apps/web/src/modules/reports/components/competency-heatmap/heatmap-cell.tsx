'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type PointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import type { HeatmapCell as HeatmapCellValue } from './heatmap.types';
import { formatHeatmapPercentage, percentageColor, safeCell } from './heatmap.utils';
import styles from './competency-heatmap.module.css';

interface Props {
  cell: HeatmapCellValue;
  year: number;
  areaLabel: string;
}

/** Tooltip fuera del recuadro scrollable para que móvil NO lo recorte. */
export function HeatmapCell({ cell, year, areaLabel }: Props) {
  const value = safeCell(cell);
  const [opened, setOpened] = useState(false);
  const [position, setPosition] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipId = useId();

  useEffect(() => {
    if (!opened) return;
    const update = () => {
      const bounds = triggerRef.current?.getBoundingClientRect();
      if (!bounds) return;
      // Evitar desbordamiento a izquierda/derecha de la ventana.
      const tooltipHalfWidth = Math.min(145, (window.innerWidth - 24) / 2);
      const left = Math.min(
        window.innerWidth - tooltipHalfWidth - 12,
        Math.max(tooltipHalfWidth + 12, bounds.left + bounds.width / 2),
      );
      const showBelow = bounds.top < 58;
      setPosition({
        left,
        top: showBelow ? bounds.bottom + 6 : bounds.top - 6,
        transform: showBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
      });
    };
    const dismiss = () => setOpened(false);
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    update();
    window.addEventListener('resize', update);
    // Cerrar cuando el usuario desplaza la tabla/página, evitando tooltip desanclado.
    window.addEventListener('scroll', dismiss, true);
    document.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', dismiss, true);
      document.removeEventListener('keydown', onEscape);
    };
  }, [opened]);

  if (value.status === 'no-data') {
    return <span className={styles.noDataCell}>Sin datos</span>;
  }
  if (value.status === 'insufficient') {
    return <span className={styles.insufficientCell}>Sin datos<br />suficientes</span>;
  }

  const percent = formatHeatmapPercentage(value.percentage);
  const detail = `Calculado sobre ${value.graduateCount} titulados`;
  const onHover = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse') setOpened(true);
  };
  const onLeave = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse') setOpened(false);
  };
  const onBlur = (event: FocusEvent<HTMLButtonElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpened(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.calculatedCell}
        style={{ backgroundColor: percentageColor(value.percentage), color: value.percentage >= 60 ? '#FFFFFF' : '#1B2632' }}
        aria-label={`Cohorte ${year}, ${areaLabel}: ${percent}. ${detail}`}
        aria-describedby={opened ? tooltipId : undefined}
        onPointerEnter={onHover}
        onPointerLeave={onLeave}
        onMouseEnter={() => setOpened(true)}
        onMouseLeave={() => setOpened(false)}
        onFocus={() => setOpened(true)}
        onBlur={onBlur}
        onClick={() => setOpened(true)}
      >
        {percent}
      </button>
      {opened && typeof document !== 'undefined' && createPortal(
        <div id={tooltipId} role="tooltip" className={styles.tooltip} style={position}>
          {percent} · {detail}
        </div>,
        document.body,
      )}
    </>
  );
}
