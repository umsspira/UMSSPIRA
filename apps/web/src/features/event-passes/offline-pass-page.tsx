'use client';

import { useEffect, useState } from 'react';
import EventPassDetailPage from './event-pass-detail-page';

export default function OfflinePassPage() {
  const [passId, setPassId] = useState<string | null>(null);

  useEffect(() => {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const id = parts[0] === 'mis-pases' ? parts[1] : undefined;

    if (id && id !== 'offline') {
      setPassId(decodeURIComponent(id));
    }
  }, []);

  if (!passId) {
    return (
      <main className="qr-passes-page">
        <div className="qr-passes-container">
          <section className="qr-passes-empty" role="status">
            <h1>Pase no disponible</h1>
            <p>Abre un pase que hayas guardado previamente en este dispositivo.</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <div className="events-app">
      <EventPassDetailPage passId={passId} backHref="/mis-pases" />
    </div>
  );
}
