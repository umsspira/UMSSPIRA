'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Plus } from 'lucide-react';
import Link from 'next/link';

import { DeleteRecordModal } from '@/modules/profile/components/delete-record-modal';
import { EditProjectForm } from '@/modules/profile/components/edit-project-form';
import { ProfileRecordsTable } from '@/modules/profile/components/profile-records-table';
import { ProjectRecordsTable } from '@/modules/profile/components/project-records-table';
import { EMPTY_PROFILE_RECORDS, RECORDS_TAB_LABELS } from '@/modules/profile/data/profile-records-data';
import { DeleteRecordException, deleteProfileRecord } from '@/modules/profile/services/profile-records-service';
import { useOptionalProfileStore } from '@/modules/profile/state/profile-store';
import type {
  DeleteRecordErrorCode,
  ProfileRecord,
  ProfileRecords,
  ProjectRecord,
  RecordsTab,
} from '@/modules/profile/types/profile-record';
import { removeProfileRecord } from '@/modules/profile/utils/remove-profile-record';
import { cn } from '@/shared/utils/cn';

// Mismo orden de pestañas que la v3 del Figma; Proyectos al final (HU-19, T19.4)
const SECTIONS: RecordsTab[] = ['education', 'certification', 'experience', 'projects'];
const TOAST_DURATION_MS = 3000;

type ProfileRecordsManagerProps = {
  initialRecords?: ProfileRecords;
  // Proyectos sin proveedor del estado (pruebas)
  initialProjects?: ProjectRecord[];
  // Pestaña abierta al entrar (por ejemplo, al cancelar la edición de una experiencia)
  initialSection?: RecordsTab;
};

export function ProfileRecordsManager({
  initialRecords = EMPTY_PROFILE_RECORDS,
  initialProjects = [],
  initialSection = 'education',
}: ProfileRecordsManagerProps) {
  // Dentro de las pantallas del perfil usa el estado compartido; sin proveedor (pruebas) usa su propio estado
  const store = useOptionalProfileStore();
  const [localRecords, setLocalRecords] = useState<ProfileRecords>(initialRecords);
  const records = store?.records ?? localRecords;
  const [localProjects, setLocalProjects] = useState<ProjectRecord[]>(initialProjects);
  const projects = store?.projects ?? localProjects;
  const [activeSection, setActiveSection] = useState<RecordsTab>(initialSection);
  const [recordToDelete, setRecordToDelete] = useState<ProfileRecord | ProjectRecord | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<ProjectRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<DeleteRecordErrorCode | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timeoutId = setTimeout(() => setToastMessage(null), TOAST_DURATION_MS);
    return () => clearTimeout(timeoutId);
  }, [toastMessage]);

  // Los proyectos se guardan en el estado del perfil, igual que en Completar perfil (T19.3)
  function removeProject(projectId: string) {
    if (store) store.removeProject(projectId);
    else setLocalProjects((current) => current.filter((item) => item.id !== projectId));
  }

  function handleSaveProject(project: ProjectRecord) {
    if (store) store.updateProject(project);
    else setLocalProjects((current) => current.map((item) => (item.id === project.id ? project : item)));
    setProjectToEdit(null);
    setToastMessage('Proyecto actualizado');
  }

  function openDeleteModal(record: ProfileRecord | ProjectRecord) {
    setDeleteError(null);
    setRecordToDelete(record);
  }

  function closeDeleteModal() {
    setRecordToDelete(null);
    setDeleteError(null);
  }

  async function handleConfirmDelete() {
    if (!recordToDelete) return;
    if (activeSection === 'projects') {
      removeProject(recordToDelete.id);
      setRecordToDelete(null);
      setToastMessage('Proyecto eliminado');
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteProfileRecord(activeSection, recordToDelete as ProfileRecord);
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
      setToastMessage('Registro eliminado');
    } catch (error) {
      setDeleteError(error instanceof DeleteRecordException ? error.code : 'network');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/profile"
          className="inline-flex w-fit items-center gap-1 text-xs font-semibold text-blue-fantastic/70 transition hover:text-blue-fantastic"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Volver al resumen
        </Link>
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
                setProjectToEdit(null);
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
              {RECORDS_TAB_LABELS[section]}
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
      ) : activeSection === 'projects' ? (
        projectToEdit ? (
          <EditProjectForm
            key={projectToEdit.id}
            project={projectToEdit}
            onSave={handleSaveProject}
            onCancel={() => setProjectToEdit(null)}
          />
        ) : (
          <ProjectRecordsTable projects={projects} onEdit={setProjectToEdit} onDelete={openDeleteModal} />
        )
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

      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-abyssal-blue px-4 py-3 text-sm font-semibold text-white shadow-lg"
        >
          <Check className="h-4 w-4 text-burning-flame" aria-hidden="true" />
          {toastMessage}
        </div>
      )}
    </div>
  );
}
