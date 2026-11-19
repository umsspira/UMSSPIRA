
'use client';

import { useEffect, useState } from 'react';
import type { AffinityArea, RadarCertificationEvidence } from '@umsspira/shared-types';
import { getAreaCertifications } from '../services/affinity-service';
import { RadarBackupViewerModal } from './radar-backup-viewer-modal';

type State = { area: AffinityArea; status: 'loading' | 'error' | 'ready'; items: RadarCertificationEvidence[] };

export function RadarCertificationsPanel({ area, calculationKey }: { area: AffinityArea; calculationKey?: string | null }) {
  const [state, setState] = useState<State>({ area, status: 'loading', items: [] });
  const [attempt, setAttempt] = useState(0);
  const [viewing, setViewing] = useState<RadarCertificationEvidence | null>(null);

  useEffect(() => {
    let active = true;
    setState({ area, status: 'loading', items: [] });
    setViewing(null);
    void (async () => {
      try {
        const result = await getAreaCertifications(area);
        if (active) setState({ area, status: 'ready', items: result.certifications });
      } catch {
        if (active) setState({ area, status: 'error', items: [] });
      }
    })();
    return () => { active = false; };
  }, [area, calculationKey, attempt]);

  const current = state.area === area ? state : { area, status: 'loading', items: [] };
  return (
    <section aria-label="Certificaciones relacionadas">
      <h5 className="font-semibold text-sm text-gray-700 mb-1">Certificaciones:</h5>
      <p className="text-xs text-gray-500 mb-3">Relacionadas por el nombre y la entidad emisora del perfil actual.</p>
      {current.status === 'loading' && <p role="status" className="text-sm text-gray-500">Cargando certificaciones…</p>}
      {current.status === 'error' && (
        <div role="alert" className="text-sm text-gray-600">
          <p>No se pudieron consultar las certificaciones de esta área.</p>
          <button type="button" onClick={() => setAttempt(value => value + 1)} className="mt-2 text-truffle-trouble underline">Reintentar</button>
        </div>
      )}
      {current.status === 'ready' && current.items.length === 0 && (
        <p className="text-sm text-gray-500">No se encontraron certificaciones relacionadas con esta área según los textos y el diccionario actual.</p>
      )}
      {current.status === 'ready' && current.items.length > 0 && (
        <ul className="space-y-2">
          {current.items.map(certification => (
            <li key={certification.id} className="rounded-lg border border-oatmeal bg-white p-3 text-sm">
              <p className="font-semibold text-gray-700">{certification.title}</p>
              <p className="text-xs text-gray-500">{certification.issuer}{certification.issuedYear !== null ? ` · ${certification.issuedYear}` : ''}</p>
              {certification.hasBackup ? (
                <button type="button" onClick={() => setViewing(certification)} className="mt-2 text-truffle-trouble underline" aria-label={`Ver respaldo de ${certification.title}`}>Ver respaldo</button>
              ) : <p className="mt-2 text-xs text-gray-500">Sin respaldo adjunto</p>}
            </li>
          ))}
        </ul>
      )}
      {viewing && <RadarBackupViewerModal key={viewing.id} certificationId={viewing.id} certificationName={viewing.title} onClose={() => setViewing(null)} />}
    </section>
  );
}
