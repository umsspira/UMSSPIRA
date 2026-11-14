import { ApiError } from '@/shared/services/api-client';
import { apiUrl, readApiError } from '@/shared/services/api-contract';
import { SessionError, authenticatedFetch } from '@/shared/services/auth-session';

const PHOTO_URL = '/api/v1/perfil/foto';
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

// Copia en el navegador: solo es un respaldo para mostrar la foto si la API no responde
async function saveLocalPhoto(photo: Blob): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  await runRequest('readwrite', (store) => store.put(photo, PHOTO_KEY));
}

async function loadLocalPhoto(): Promise<Blob | null> {
  // Sin IndexedDB (por ejemplo, al renderizar en el servidor) no hay foto guardada
  if (typeof indexedDB === 'undefined') return null;
  const photo = await runRequest<unknown>('readonly', (store) => store.get(PHOTO_KEY));
  return photo instanceof Blob ? photo : null;
}

// HU-16 (T16.2): la foto se guarda en la API (PUT /api/v1/perfil/foto, campo «foto»); si responde 400 se
// rechaza con su mensaje. Al guardarse bien también queda la copia local
export async function saveProfilePhoto(photo: Blob): Promise<void> {
  const form = new FormData();
  form.append('foto', photo, 'foto.jpg');
  let response: Response;
  try {
    response = await authenticatedFetch(apiUrl(PHOTO_URL), { method: 'PUT', body: form });
  } catch (error) {
    if (error instanceof SessionError) throw new ApiError(error.status, error.message);
    throw new ApiError(0, 'No fue posible conectar con el servidor');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, readApiError(body, 'No se pudo guardar la foto').message);
  }
  await saveLocalPhoto(photo).catch(() => undefined);
}

// HU-16 (T16.2): foto del titulado desde la API; 404 = todavía no tiene. Si la API no responde se usa
// la copia local, para que el encabezado no pierda la foto por un corte
export async function loadProfilePhoto(): Promise<Blob | null> {
  try {
    const response = await authenticatedFetch(apiUrl(PHOTO_URL));
    if (response.status === 404) return null;
    if (response.ok) {
      const photo = await response.blob();
      await saveLocalPhoto(photo).catch(() => undefined);
      return photo;
    }
  } catch {
    // Sin conexión o sin sesión: se intenta con la copia local
  }
  return loadLocalPhoto().catch(() => null);
}