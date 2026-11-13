
export interface OfflineQrEventDetails {
  name: string;
  userName: string;
  dateTime: string;
  location: string;
}

export interface OfflineQrPass {
  id: string;
  userId: string;
  qrToken: string;
  eventDetails: OfflineQrEventDetails;
  savedAt: string;
}

export type OfflineQrPassInput = Omit<OfflineQrPass, 'savedAt'>;

const DATABASE_NAME = 'umsspira-offline';
const DATABASE_VERSION = 1;
const STORE_NAME = 'qr-passes';
const USER_INDEX = 'by-user-id';

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(
      new Error('IndexedDB no está disponible en este navegador.')
    );
  }

  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, {
          keyPath: 'id',
        });

        store.createIndex(USER_INDEX, 'userId', {
          unique: false,
        });
      }
    };

    request.onsuccess = () => {
      const database = request.result;

      database.onversionchange = () => database.close();

      resolve(database);
    };

    request.onerror = () => {
      databasePromise = null;
      reject(request.error ?? new Error('No se pudo abrir IndexedDB.'));
    };

    request.onblocked = () => {
      databasePromise = null;
      reject(new Error('La apertura de IndexedDB está bloqueada.'));
    };
  });

  return databasePromise;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      reject(request.error ?? new Error('Error en la operación IndexedDB.'));
    };
  });
}

function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();

    transaction.onerror = () => {
      reject(transaction.error ?? new Error('Error en la transacción.'));
    };

    transaction.onabort = () => {
      reject(transaction.error ?? new Error('La transacción fue cancelada.'));
    };
  });
}

function validatePass(pass: OfflineQrPassInput): void {
  if (!pass.id.trim() || !pass.userId.trim() || !pass.qrToken.trim()) {
    throw new Error('Los datos del pase QR están incompletos.');
  }
}

export async function saveOfflineQrPass(
  pass: OfflineQrPassInput
): Promise<OfflineQrPass> {
  validatePass(pass);

  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  const completed = transactionToPromise(transaction);

  const savedPass: OfflineQrPass = {
    ...pass,
    savedAt: new Date().toISOString(),
  };

  try {
    await requestToPromise(
      transaction.objectStore(STORE_NAME).put(savedPass)
    );

    await completed;
    return savedPass;
  } catch (error) {
    try {
      transaction.abort();
    } catch {
      // La transacción puede haber finalizado o cancelado.
    }

    await completed.catch(() => undefined);
    throw error;
  }
}

export async function getOfflineQrPasses(
  userId: string
): Promise<OfflineQrPass[]> {
  if (!userId.trim()) {
    throw new Error('Se requiere el identificador del usuario.');
  }

  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readonly');
  const completed = transactionToPromise(transaction);

  const request = transaction
    .objectStore(STORE_NAME)
    .index(USER_INDEX)
    .getAll(userId);

  const passes = await requestToPromise<OfflineQrPass[]>(request);
  await completed;

  return passes.sort(
    (a, b) =>
      new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

export async function getOfflineQrPass(
  id: string,
  userId: string
): Promise<OfflineQrPass | null> {
  if (!id.trim() || !userId.trim()) {
    throw new Error('Se requiere el identificador del pase y del usuario.');
  }

  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readonly');
  const completed = transactionToPromise(transaction);

  const request = transaction.objectStore(STORE_NAME).get(id);
  const pass = await requestToPromise<OfflineQrPass | undefined>(request);

  await completed;

  if (!pass || pass.userId !== userId) return null;

  return pass;
}

export async function deleteOfflineQrPass(
  id: string,
  userId: string
): Promise<boolean> {
  if (!id.trim() || !userId.trim()) {
    throw new Error('Se requiere el identificador del pase y del usuario.');
  }

  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  const completed = transactionToPromise(transaction);

  try {
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    const pass = await requestToPromise<OfflineQrPass | undefined>(request);

    if (!pass || pass.userId !== userId) {
      await completed;
      return false;
    }

    await requestToPromise(store.delete(id));
    await completed;

    return true;
  } catch (error) {
    try {
      transaction.abort();
    } catch {
      // La transacción puede haber finalizado o cancelado.
    }

    await completed.catch(() => undefined);
    throw error;
  }
}
export async function clearOfflineQrPasses(): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  const completed = transactionToPromise(transaction);

  try {
    transaction.objectStore(STORE_NAME).clear();
    await completed;
  } catch (error) {
    try {
      transaction.abort();
    } catch {
      // La transacción puede haber finalizado o cancelado.
    }

    await completed.catch(() => undefined);
    throw error;
  }
}

