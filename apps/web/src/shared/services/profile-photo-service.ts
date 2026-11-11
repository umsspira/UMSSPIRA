
const DATABASE_NAME = 'umsspira-profile';
const STORE_NAME = 'profile-photo';
const PHOTO_KEY = 'current';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function runRequest<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = operation(transaction.objectStore(STORE_NAME));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

export async function saveProfilePhoto(photo: Blob): Promise<void> {
  await runRequest('readwrite', (store) => store.put(photo, PHOTO_KEY));
}

export async function loadProfilePhoto(): Promise<Blob | null> {
  // Sin IndexedDB (por ejemplo, al renderizar en el servidor) no hay foto guardada
  if (typeof indexedDB === 'undefined') return null;
  const photo = await runRequest<unknown>('readonly', (store) => store.get(PHOTO_KEY));
  return photo instanceof Blob ? photo : null;
}