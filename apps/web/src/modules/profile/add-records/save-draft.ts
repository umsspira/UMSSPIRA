import {
  crearCertificacion,
  crearExperiencia,
  crearFormacion,
  crearProyecto,
  subirRespaldo,
} from '@/modules/profile/services/perfil-api';
import type { DraftRecord } from '@/modules/profile/state/drafts-store';
import type {
  CertificationRecord,
  EducationRecord,
  ExperienceRecord,
  ProjectRecord,
} from '@/modules/profile/types/profile-record';
import { urlDeArchivo } from '@/modules/profile/utils/backup-url';
import { crearIdOperacion } from '@/modules/profile/utils/certification-operation';

export type SavedDraft =
  | { section: 'education'; record: EducationRecord }
  | { section: 'experience'; record: ExperienceRecord }
  | { section: 'certification'; record: CertificationRecord }
  | { section: 'project'; record: ProjectRecord };

// Intento de guardar una certificación: conserva idOperacion y la ya creada para que «Reintentar»
// no la duplique si solo falló la subida del respaldo (igual que Completar perfil, T8.6)
export type CertificationAttempt = { idOperacion: string; creada?: CertificationRecord };

/** Guarda un borrador con la API, con los mismos servicios que Completar perfil, y devuelve el registro creado. */
export async function persistDraft(
  draft: DraftRecord,
  attempts: Map<string, CertificationAttempt>,
): Promise<SavedDraft> {
  switch (draft.section) {
    case 'education':
      return { section: 'education', record: await crearFormacion(draft.data) };
    case 'experience':
      return { section: 'experience', record: await crearExperiencia(draft.data) };
    case 'certification': {
      let attempt = attempts.get(draft.id);
      if (!attempt) {
        attempt = { idOperacion: crearIdOperacion() };
        attempts.set(draft.id, attempt);
      }
      const creada = attempt.creada ?? (await crearCertificacion(draft.data, attempt.idOperacion));
      attempt.creada = creada;
      if (draft.data.respaldo) await subirRespaldo(creada.id, draft.data.respaldo);
      attempts.delete(draft.id);
      return {
        section: 'certification',
        record: {
          ...creada,
          // Un respaldo recién subido queda en revisión hasta que la administración lo valide
          backupFile: draft.data.respaldo?.name,
          backupUrl: urlDeArchivo(draft.data.respaldo),
          backupVerified: false,
        },
      };
    }
    case 'project':
      return { section: 'project', record: await crearProyecto(draft.data) };
  }
}
