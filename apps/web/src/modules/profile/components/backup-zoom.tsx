'use client';

import { useState, type ReactNode } from 'react';
import { Minus, Plus } from 'lucide-react';

import {
  DEFAULT_ZOOM_PERCENT,
  MAX_ZOOM_PERCENT,
  MIN_ZOOM_PERCENT,
  zoomIn,
  zoomOut,
} from '@/modules/profile/utils/backup-zoom';

type BackupZoomProps = {
  // Mientras el respaldo carga no se muestran los botones y el contenido queda como está
  isReady: boolean;
  children: ReactNode;
};

const zoomButtonClassName =
  'flex h-9 w-9 items-center justify-center rounded-lg border border-truffle-trouble bg-white text-truffle-trouble transition hover:bg-palladian disabled:cursor-not-allowed disabled:opacity-40';

// Zoom «+» y «−» del visor de respaldos (HU-21, T21.7, CA-07). Envuelve el contenido del visor
// (foto o PDF) sin cambiar cómo se dibuja, para integrarse con el visor de HU-18 sin conflictos.
export function BackupZoom({ isReady, children }: BackupZoomProps) {
  const [zoomPercent, setZoomPercent] = useState(DEFAULT_ZOOM_PERCENT);
  const scale = zoomPercent / 100;

  return (
    // Antes de cargar, «contents» deja el contenido igual que sin zoom
    <div className={isReady ? 'flex min-h-0 w-full flex-col self-stretch' : 'contents'}>
      {isReady && (
        <div className="flex shrink-0 items-center justify-end gap-2 border-b border-oatmeal bg-white/70 px-2 py-2">
          <button
            type="button"
            onClick={() => setZoomPercent(zoomOut)}
            disabled={zoomPercent <= MIN_ZOOM_PERCENT}
            aria-label="Alejar"
            className={zoomButtonClassName}
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <span aria-live="polite" className="w-14 text-center text-sm font-semibold text-blue-fantastic">
            {zoomPercent} %
          </span>
          <button
            type="button"
            onClick={() => setZoomPercent(zoomIn)}
            disabled={zoomPercent >= MAX_ZOOM_PERCENT}
            aria-label="Acercar"
            className={zoomButtonClassName}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
      {/* Al acercar, la imagen o el documento crece hacia la derecha y abajo y se recorre con scroll */}
      <div data-testid="backup-zoom-area" className={isReady ? 'min-h-0 flex-1 overflow-auto' : 'contents'}>
        <div
          data-testid="backup-zoom-content"
          style={
            isReady
              ? { transform: `scale(${scale})`, transformOrigin: scale > 1 ? 'top left' : 'top center' }
              : undefined
          }
          className={isReady ? 'flex w-full justify-center transition-transform duration-200 motion-reduce:transition-none' : 'contents'}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
