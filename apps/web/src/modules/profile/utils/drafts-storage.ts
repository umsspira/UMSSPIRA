import type { DraftRecord } from '@/modules/profile/state/drafts-store';

/** Conservación de los borradores de «Agregar registros» en el navegador (HU-14, T14.3). */
export const DRAFTS_STORAGE_KEY = 'umsspira.profile.drafts';

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

/** Borradores guardados; si no hay, están dañados o el navegador no deja leer, devuelve una lista vacía. */
export function loadDrafts(): DraftRecord[] {
  try {
    const raw = window.localStorage.getItem(DRAFTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DraftRecord[]).map(fromStored) : [];
  } catch {
    return [];
  }
}

// Leer los respaldos es asíncrono: si llega un cambio nuevo mientras tanto, solo se escribe el último
let lastSave = 0;

/** Guarda los borradores. Si el navegador no deja (lleno, unos 5 MB, o bloqueado) no se rompe la página. */
export async function saveDrafts(drafts: DraftRecord[]): Promise<void> {
  const save = ++lastSave;
  try {
    const stored = await Promise.all(drafts.map(toStored));
    if (save !== lastSave) return;
    if (stored.length === 0) window.localStorage.removeItem(DRAFTS_STORAGE_KEY);
    else window.localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // QuotaExceededError u otro: los borradores siguen en pantalla, solo no se conservan
  }
}
