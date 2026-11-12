import type { EventPassDto } from '@umsspira/shared-types';

const DATABASE_NAME = 'umsspira-event-passes';
const DATABASE_VERSION = 1;
const STORE_NAME = 'passes';

interface StoredPass {
  key: string;
  ownerId: string;
  savedAt: string;
  pass: EventPassDto;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('No se pudo abrir el almacenamiento local.'));
  });
}

function passKey(ownerId: string, passId: string): string {
  return JSON.stringify([ownerId, passId]);
}

export async function saveOfflinePass(
  ownerId: string,
  pass: EventPassDto,
): Promise<void> {
  if (!ownerId || pass.userId !== ownerId) {
    throw new Error('El pase no pertenece a la cuenta actual.');
  }

  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const record: StoredPass = {
        key: passKey(ownerId, pass.id),
        ownerId,
        savedAt: new Date().toISOString(),
        pass,
      };

      transaction.objectStore(STORE_NAME).put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

export async function getOfflinePass(
  ownerId: string,
  passId: string,
): Promise<StoredPass | null> {
  if (!ownerId || !passId) return null;

  const database = await openDatabase();

  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(passKey(ownerId, passId));

      request.onsuccess = () => {
        const result = request.result as StoredPass | undefined;
        resolve(
          result && result.ownerId === ownerId && result.pass.userId === ownerId
            ? result
            : null,
        );
      };
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}


export async function listOfflinePasses(ownerId: string): Promise<StoredPass[]> {
  if (!ownerId) return [];

  const database = await openDatabase();

  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).getAll();

      request.onsuccess = () => {
        const records = request.result as StoredPass[];
        resolve(
          records.filter(
            (record) =>
              record.ownerId === ownerId &&
              record.pass.userId === ownerId,
          ),
        );
      };
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}
