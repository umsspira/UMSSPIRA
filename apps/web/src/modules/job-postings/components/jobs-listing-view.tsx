'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import JobsBoard, { type VacancyListingState } from './jobs-board';

export default function JobsListingView({ controls, lookup, state, onRefresh, offerHref, dateLabel, notice }: {
  controls: ReactNode;
  lookup: ReactNode;
  state?: VacancyListingState;
  onRefresh?: () => void;
  offerHref?: (id: string) => string;
  dateLabel?: string;
  notice?: string;
}) {
  const [lookupOpen, setLookupOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lookupOpen) panel.current?.querySelector('input')?.focus();
  }, [lookupOpen]);

  function closeLookup() {
    setLookupOpen(false);
    document.getElementById('hu8-consult-by-id')?.focus();
  }

  return (
    <main id="hu8-main" className="hu8-board-page">
      <div className="hu8-board-content">
        {controls}
        <JobsBoard state={state} onRefresh={onRefresh} offerHref={offerHref} dateLabel={dateLabel} notice={notice} lookupOpen={lookupOpen} onConsultById={() => lookupOpen ? closeLookup() : setLookupOpen(true)} />
        {lookupOpen && (
          <div id="hu8-id-consultation" ref={panel} onKeyDown={(event) => { if (event.key === 'Escape') closeLookup(); }}>
            <div className="hu8-lookup-close"><button type="button" className="hu8-board-textButton" onClick={closeLookup}>Cerrar consulta por ID</button></div>
            {lookup}
          </div>
        )}
      </div>
    </main>
  );
}
