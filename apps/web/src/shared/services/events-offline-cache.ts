
import type { EventItem } from '@umsspira/shared-types';

const DB_NAME = 'umsspira-hu04';
const DB_VERSION = 1;
const STORE_NAME = 'public-events';
const CATALOG_KEY = 'catalog';

interface CachedEventCatalog {
  key: string;
  events: EventItem[];
  updatedAt: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no disponible'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: 'key',
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Error al abrir IndexedDB'));
  });
}

export async function saveEventCatalogOffline(
  events: EventItem[],
): Promise<void> {
  const db = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');

      transaction.objectStore(STORE_NAME).put({
        key: CATALOG_KEY,
        events,
        updatedAt: new Date().toISOString(),
      } satisfies CachedEventCatalog);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('Error al guardar eventos'));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('Guardado cancelado'));
    });
  } finally {
    db.close();
  }
}

export async function readEventCatalogOffline():
  Promise<CachedEventCatalog | null> {
  const db = await openDatabase();

  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(CATALOG_KEY);

      request.onsuccess = () =>
        resolve((request.result as CachedEventCatalog | undefined) ?? null);

      request.onerror = () =>
        reject(request.error ?? new Error('Error al leer eventos'));
    });
  } finally {
    db.close();
  }
}
