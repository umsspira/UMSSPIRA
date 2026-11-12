'use client';

import { useEffect } from 'react';

export function PassWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    void navigator.serviceWorker.register('/sw.js', { scope: '/mis-pases' })
      .catch((error: unknown) => {
        console.error('No se pudo preparar el acceso sin conexión.', error);
      });
  }, []);

  return null;
}
