'use client';

import { useEffect, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import Link from 'next/link';

import { DeleteRecordModal } from '@/modules/profile/components/delete-record-modal';
import { ProfileRecordsTable } from '@/modules/profile/components/profile-records-table';
import { EMPTY_PROFILE_RECORDS, SECTION_LABELS } from '@/modules/profile/data/profile-records-data';
import { DeleteRecordException, deleteProfileRecord } from '@/modules/profile/services/profile-records-service';
import { useOptionalProfileStore } from '@/modules/profile/state/profile-store';
import type {
  DeleteRecordErrorCode,
  ProfileRecord,
  ProfileRecords,
  RecordSection,
} from '@/modules/profile/types/profile-record';
import { removeProfileRecord } from '@/modules/profile/utils/remove-profile-record';
import { BackButton } from '@/shared/components/back-button';
import { cn } from '@/shared/utils/cn';

// Mismo orden de pestañas que la v3 del Figma
const SECTIONS: RecordSection[] = ['education', 'certification', 'experience'];
const TOAST_DURATION_MS = 3000;

type ProfileRecordsManagerProps = {
  initialRecords?: ProfileRecords;
  // Pestaña abierta al entrar (por ejemplo, al cancelar la edición de una experiencia)
  initialSection?: RecordSection;
  // Se llega desde «Guardar cambios» de una edición (HU-11)
  wasUpdated?: boolean;
};

export function ProfileRecordsManager({
  initialRecords = EMPTY_PROFILE_RECORDS,
  initialSection = 'education',
  wasUpdated = false,
}: ProfileRecordsManagerProps) {
  // Dentro de las pantallas del perfil usa el estado compartido; sin proveedor (pruebas) usa su propio estado
  const store = useOptionalProfileStore();
  const [localRecords, setLocalRecords] = useState<ProfileRecords>(initialRecords);
  const records = store?.records ?? localRecords;
  const [activeSection, setActiveSection] = useState<RecordSection>(initialSection);
  const [recordToDelete, setRecordToDelete] = useState<ProfileRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<DeleteRecordErrorCode | null>(null);
  const [isToastVisible, setIsToastVisible] = useState(false);

  useEffect(() => {
    if (!isToastVisible) return;
    const timeoutId = setTimeout(() => setIsToastVisible(false), TOAST_DURATION_MS);
    return () => clearTimeout(timeoutId);
  }, [isToastVisible]);

  const [isUpdatedToastVisible, setIsUpdatedToastVisible] = useState(wasUpdated);

  useEffect(() => {
    if (!isUpdatedToastVisible) return;
    // Se quita la marca de la URL para que el aviso no vuelva a salir al recargar
    const params = new URLSearchParams(window.location.search);
    if (params.has('actualizado')) {
      params.delete('actualizado');
      window.history.replaceState(window.history.state, '', `${window.location.pathname}?${params}`);
    }
    const timeoutId = setTimeout(() => setIsUpdatedToastVisible(false), TOAST_DURATION_MS);
    return () => clearTimeout(timeoutId);
  }, [isUpdatedToastVisible]);

  function openDeleteModal(record: ProfileRecord) {
    setDeleteError(null);
    setRecordToDelete(record);
  }

  function closeDeleteModal() {
    setRecordToDelete(null);
    setDeleteError(null);
  }

  async function handleConfirmDelete() {
    if (!recordToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteProfileRecord(activeSection, recordToDelete);
      // Se actualiza solo la lista en memoria, sin recargar la pantalla
      if (store) {
        store.removeRecord(activeSection, recordToDelete.id);
      } else {
        setLocalRecords((current) => ({
          ...current,
          [activeSection]: removeProfileRecord(current[activeSection], recordToDelete.id),
        }));
      }
      setRecordToDelete(null);
      setIsToastVisible(true);
    } catch (error) {
      setDeleteError(error instanceof DeleteRecordException ? error.code : 'network');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <BackButton href="/profile" ariaLabel="Volver a Mi perfil" />
        <h1 className="text-[28px] font-semibold leading-tight text-blue-fantastic">
          Mis registros del perfil
        </h1>
        <p className="text-sm text-blue-fantastic/70">Edita o elimina tu información profesional.</p>
      </header>

      <Link
        href="/profile/completar"
        className="inline-flex w-fit items-center gap-2 rounded-lg bg-burning-flame px-5 py-3 text-sm font-bold text-abyssal-blue transition hover:brightness-95"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Agregar Registros
      </Link>

      <div role="tablist" aria-label="Secciones del perfil" className="flex gap-6 overflow-x-auto border-b border-oatmeal">
        {SECTIONS.map((section) => {
          const isActive = section === activeSection;
          return (
            <button
              key={section}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setActiveSection(section);
                // La pestaña queda en la URL para que al recargar se conserve (BUG HU9-01)
                const params = new URLSearchParams(window.location.search);
                params.set('seccion', section);
                window.history.replaceState(window.history.state, '', `${window.location.pathname}?${params}`);
              }}
              className={cn(
                '-mb-px whitespace-nowrap border-b-2 pb-2.5 text-sm transition',
                isActive
                  ? 'border-truffle-trouble font-bold text-blue-fantastic'
                  : 'border-transparent font-medium text-blue-fantastic/60 hover:text-blue-fantastic',
              )}
            >
              {SECTION_LABELS[section]}
            </button>
          );
        })}
      </div>

      {/* Mientras llega GET /perfil no se muestran los datos de prueba; si falla se puede reintentar */}
      {store?.isLoading ? (
        <p role="status" className="rounded-2xl border border-abyssal-blue/10 bg-white px-6 py-10 text-center text-sm text-blue-fantastic/70">
          Cargando tus registros…
        </p>
      ) : store?.loadError ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-2xl border border-abyssal-blue/10 bg-white px-6 py-6 text-sm"
        >
          <p>No se pudieron cargar tus registros. {store.loadError}</p>
          <button
            type="button"
            onClick={store.retryLoad}
            className="rounded-lg bg-burning-flame px-4 py-2 font-bold text-abyssal-blue"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <ProfileRecordsTable section={activeSection} records={records[activeSection]} onDelete={openDeleteModal} />
      )}

      {recordToDelete && (
        <DeleteRecordModal
          section={activeSection}
          record={recordToDelete}
          isDeleting={isDeleting}
          errorCode={deleteError}
          onConfirm={handleConfirmDelete}
          onCancel={closeDeleteModal}
        />
      )}

      {isToastVisible && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-abyssal-blue px-4 py-3 text-sm font-semibold text-white shadow-lg"
        >
          <Check className="h-4 w-4 text-burning-flame" aria-hidden="true" />
          Registro eliminado
        </div>
      )}

      {isUpdatedToastVisible && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-abyssal-blue px-4 py-3 text-sm font-semibold text-white shadow-lg"
        >
          <Check className="h-4 w-4 text-burning-flame" aria-hidden="true" />
          Registro actualizado
        </div>
      )}
    </div>
  );
}
