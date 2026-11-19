'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';

export function useServiceWorkerUpdate() {
  const [state, setState] = useState({
    registration: null as ServiceWorkerRegistration | null,
    waitingWorker: null as ServiceWorker | null,
    updateAvailable: false,
  });
  
  // Obtenemos la ruta actual para detectar cambios de página
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const onUpdateFound = (reg: ServiceWorkerRegistration) => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          setState((s) => ({ ...s, registration: reg, waitingWorker: newWorker, updateAvailable: true }));
        }
      });
    };

    // Función que busca actualizaciones en el servidor
    const checkForUpdates = () => {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg) {
            console.log('[SW Hook] Buscando actualizaciones...');
            reg.update(); // Esto fuerza la búsqueda en el servidor
          }
        });
      }
    };

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      setState((s) => ({ ...s, registration: reg }));
      
      // Si ya había una actualización esperando
      if (reg.waiting) {
        setState((s) => ({ ...s, waitingWorker: reg.waiting, updateAvailable: true }));
      }
      
      reg.addEventListener('updatefound', () => onUpdateFound(reg));
    });

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    // 1. Buscar actualización cuando el usuario navega (cambia de ruta)
    checkForUpdates();

    // 2. Buscar actualización cada 10 segundos (para la demo en vivo)
    // En producción real, esto podría ser cada 30 o 60 minutos.
    const intervalId = setInterval(checkForUpdates, 10000);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      clearInterval(intervalId);
    };
  }, [pathname]); // Se reinicia si el usuario cambia de página

  const applyUpdate = useCallback(() => {
    if (state.waitingWorker) {
      state.waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else if (state.registration) {
      state.registration.update();
    }
  }, [state]);

  const dismissUpdate = useCallback(() => setState((s) => ({ ...s, updateAvailable: false })), []);

  return { updateAvailable: state.updateAvailable, applyUpdate, dismissUpdate, registration: state.registration };
}