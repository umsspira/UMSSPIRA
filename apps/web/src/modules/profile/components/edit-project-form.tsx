'use client';

import { useState } from 'react';

import { INPUT_CLASS } from '@/modules/profile/components/edit-record-layout';
import type { ProjectRecord } from '@/modules/profile/types/profile-record';
import { MensajeError, claseCampo } from '@/modules/profile/validation/mensaje-error';
import {
  LARGO_MAXIMO_DESCRIPCION_PROYECTO,
  LARGO_MAXIMO_NOMBRE_PROYECTO,
  validarEnlaceProyecto,
} from '@/modules/profile/validation/reglas-proyecto';

type EditProjectFormProps = {
  project: ProjectRecord;
  onSave: (project: ProjectRecord) => void;
  onCancel: () => void;
};

// Edición de un proyecto desde Mis registros (HU-19, T19.4). Mismas reglas que en Completar perfil (T19.3)
export function EditProjectForm({ project, onSave, onCancel }: EditProjectFormProps) {
  const [name, setName] = useState(project.name);
  const [url, setUrl] = useState(project.url);
  const [description, setDescription] = useState(project.description ?? '');
  const [urlError, setUrlError] = useState<string>();
  const [nameError, setNameError] = useState<string>();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextNameError = name.trim() ? undefined : 'Ingresa el nombre del proyecto';
    // Un enlace que no es https válido no se guarda
    const nextUrlError = validarEnlaceProyecto(url);
    setNameError(nextNameError);
    setUrlError(nextUrlError);
    if (nextNameError || nextUrlError) return;

    onSave({
      ...project,
      name: name.trim(),
      url: url.trim(),
      // Descripción vacía = sin descripción
      description: description.trim() || undefined,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Editar proyecto"
      className="flex flex-col gap-5 rounded-2xl border border-abyssal-blue/10 bg-[#FFFCF7] p-4 md:p-6"
    >
      <h2 className="text-base font-bold text-abyssal-blue md:text-lg">Editar proyecto</h2>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-[7px]">
          <label htmlFor="edit-project-name" className="text-[13px] font-semibold text-blue-fantastic">
            Nombre del proyecto
          </label>
          <input
            id="edit-project-name"
            type="text"
            value={name}
            maxLength={LARGO_MAXIMO_NOMBRE_PROYECTO}
            onChange={(event) => {
              setName(event.target.value);
              if (nameError && event.target.value.trim()) setNameError(undefined);
            }}
            aria-invalid={Boolean(nameError)}
            aria-describedby="error-edit-project-name"
            className={claseCampo(INPUT_CLASS, nameError)}
          />
          <MensajeError id="error-edit-project-name" mensaje={nameError} />
        </div>
        <div className="flex min-w-0 flex-col gap-[7px]">
          <label htmlFor="edit-project-url" className="text-[13px] font-semibold text-blue-fantastic">
            Enlace
          </label>
          <input
            id="edit-project-url"
            type="url"
            inputMode="url"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              // Una vez mostrado, el error se recalcula mientras se corrige
              if (urlError) setUrlError(validarEnlaceProyecto(event.target.value));
            }}
            placeholder="https://"
            aria-invalid={Boolean(urlError)}
            aria-describedby="error-edit-project-url"
            className={claseCampo(INPUT_CLASS, urlError)}
          />
          <MensajeError id="error-edit-project-url" mensaje={urlError} />
        </div>
      </div>

      <div className="flex flex-col gap-[7px]">
        <label htmlFor="edit-project-description" className="text-[13px] font-semibold text-blue-fantastic">
          Descripción corta (opcional)
        </label>
        <textarea
          id="edit-project-description"
          value={description}
          maxLength={LARGO_MAXIMO_DESCRIPCION_PROYECTO}
          rows={3}
          onChange={(event) => setDescription(event.target.value)}
          className={`${INPUT_CLASS} min-h-[88px] resize-y`}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          className="rounded-lg bg-burning-flame px-7 py-3.5 text-[15px] font-semibold text-abyssal-blue transition hover:brightness-95"
        >
          Guardar cambios
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-oatmeal bg-white px-7 py-3.5 text-[15px] font-semibold text-blue-fantastic transition hover:bg-palladian"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
