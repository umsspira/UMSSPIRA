import type { DraftDataBySection, DraftRecord, DraftSection } from '@/modules/profile/state/drafts-store';

/** Conservación de los borradores de «Agregar registros» en el navegador (HU-14, T14.3). */
export const DRAFTS_STORAGE_PREFIX = 'umsspira.profile.drafts';

/**
 * Cada titulado tiene su propia clave: en un navegador compartido nadie ve ni guarda los borradores
 * (con sus respaldos) de otro egresado. Sin titulado no se conserva nada.
 */
export function draftsStorageKey(ownerId: string): string {
  return `${DRAFTS_STORAGE_PREFIX}.${ownerId}`;
}

/** Borra los borradores de todos los titulados de este navegador (al cerrar sesión). */
export function clearAllProfileDrafts(): void {
  try {
    const keys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key === DRAFTS_STORAGE_PREFIX || key?.startsWith(`${DRAFTS_STORAGE_PREFIX}.`)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // El navegador puede tener el almacenamiento bloqueado: no hay nada que borrar
  }
}

// Respaldo de una certificación guardado como texto: el File no se puede pasar a JSON
type StoredFile = { name: string; type: string; dataUrl: string };

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// data:image/jpeg;base64,... -> File
function dataUrlToFile({ name, type, dataUrl }: StoredFile): File {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type });
}

async function toStored(draft: DraftRecord): Promise<unknown> {
  if (draft.section !== 'certification' || !draft.data.respaldo) return draft;
  const file = draft.data.respaldo;
  const respaldo: StoredFile = { name: file.name, type: file.type, dataUrl: await readAsDataUrl(file) };
  return { ...draft, data: { ...draft.data, respaldo } };
}

function fromStored(stored: DraftRecord): DraftRecord {
  if (stored.section !== 'certification' || !stored.data.respaldo) return stored;
  const respaldo = dataUrlToFile(stored.data.respaldo as unknown as StoredFile);
  return { ...stored, data: { ...stored.data, respaldo } };
}

/** Borradores guardados del titulado; si no hay, están dañados o el navegador no deja leer, devuelve una lista vacía. */
export function loadDrafts(ownerId: string): DraftRecord[] {
  if (!ownerId) return [];
  try {
    // La clave antigua era compartida por todos los usuarios: no se puede saber de quién es, se descarta
    window.localStorage.removeItem(DRAFTS_STORAGE_PREFIX);
    const raw = window.localStorage.getItem(draftsStorageKey(ownerId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DraftRecord[]).map(fromStored) : [];
  } catch {
    return [];
  }
}

// Leer los respaldos es asíncrono: si llega un cambio nuevo mientras tanto, solo se escribe el último
let lastSave = 0;

/** Guarda los borradores del titulado. Si el navegador no deja (lleno, unos 5 MB, o bloqueado) no se rompe la página. */
export async function saveDrafts(drafts: DraftRecord[], ownerId: string): Promise<void> {
  if (!ownerId) return;
  const key = draftsStorageKey(ownerId);
  const save = ++lastSave;
  try {
    const stored = await Promise.all(drafts.map(toStored));
    if (save !== lastSave) return;
    if (stored.length === 0) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(stored));
  } catch {
    // QuotaExceededError u otro: los borradores siguen en pantalla, solo no se conservan
  }
}

export type IncompleteEntry = { [S in DraftSection]: { section: S; data: DraftDataBySection[S] } }[DraftSection];

/**
 * «Guardar borrador» de Completar perfil: lo escrito en cada apartado queda como borrador incompleto en
 * «Agregar registros» (uno por apartado, reemplaza al anterior del mismo apartado). Devuelve cuántos guardó.
 */
export async function saveIncompleteEntries(ownerId: string, entries: IncompleteEntry[]): Promise<number> {
  if (!ownerId || entries.length === 0) return 0;
  const sections = new Set(entries.map((entry) => entry.section));
  const kept = loadDrafts(ownerId).filter((draft) => !(draft.isIncomplete && sections.has(draft.section)));
  const stamp = Date.now();
  const added = entries.map((entry, index) => ({ id: `borrador-${stamp + index}`, ...entry, isIncomplete: true }) as DraftRecord);
  await saveDrafts([...kept, ...added], ownerId);
  return added.length;
}
