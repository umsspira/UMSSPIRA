'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import {
  EditRecordLayout,
  FormField,
  INPUT_CLASS,
  RecordNotFound,
} from '@/modules/profile/components/edit-record-layout';
import { recordsHref, updatedRecordHref } from '@/modules/profile/data/profile-records-data';
import { actualizarProyecto } from '@/modules/profile/services/perfil-api';
import { useProfileStore } from '@/modules/profile/state/profile-store';
import type { ProjectRecord } from '@/modules/profile/types/profile-record';
import { MensajeError, claseCampo } from '@/modules/profile/validation/mensaje-error';
import {
  LARGO_MAXIMO_DESCRIPCION_PROYECTO,
  LARGO_MAXIMO_ENLACE_PROYECTO,
  LARGO_MAXIMO_NOMBRE_PROYECTO,
  LARGO_MAXIMO_TECNOLOGIAS_PROYECTO,
  validarEnlaceProyecto,
} from '@/modules/profile/validation/reglas-perfil';
import { ApiError } from '@/shared/services/api-client';

type ProjectFormData = {
  name: string;
  url: string;
  description: string;
  technologies: string;
};

// Editar proyecto (HU-19, T19.4): mismo diseño y regreso a Mis registros que las otras tres secciones
export function EditProjectForm() {
  const { id } = useParams<{ id: string }>();
  const { records } = useProfileStore();
  const project = (records.project as ProjectRecord[]).find((record) => record.id === id);

  if (!project) return <RecordNotFound label="proyecto" />;

  return <EditProjectFields key={project.id} project={project} />;
}

function EditProjectFields({ project }: { project: ProjectRecord }) {
  const router = useRouter();
  const { updateRecord } = useProfileStore();
  const [formData, setFormData] = useState<ProjectFormData>({
    name: project.name,
    url: project.url,
    description: project.description,
    technologies: project.technologies ?? '',
  });
  const [isSaved, setIsSaved] = useState(false);
  const [urlError, setUrlError] = useState<string>();
  const [saveError, setSaveError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setIsSaved(false);
    setSaveError(undefined);
    if (name === 'url' && urlError) setUrlError(validarEnlaceProyecto(value));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    const error = validarEnlaceProyecto(formData.url);
    setUrlError(error);
    if (error) return;

    setIsSaving(true);
    try {
      const updated = await actualizarProyecto(project.id, {
        nombre: formData.name,
        enlace: formData.url,
        descripcion: formData.description,
        tecnologias: formData.technologies,
      });
      updateRecord('project', updated);
      setIsSaved(true);
      // Vuelve a la pestaña Proyectos con el aviso «Registro actualizado» (HU-11)
      router.push(updatedRecordHref('project'));
    } catch (apiError) {
      if (!(apiError instanceof ApiError)) throw apiError;
      setSaveError(apiError.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <EditRecordLayout
      title="Editar proyecto"
      description="Modifica los datos de este proyecto y guarda los cambios."
      number="05"
      sectionTitle="Proyectos y portafolio"
      sectionSubtitle="Tus proyectos y trabajos publicados"
      isSaved={isSaved}
      onSubmit={handleSubmit}
      onCancel={() => router.push(recordsHref('project'))}
    >
      <FormField id="name" label="Nombre del proyecto">
        <input
          id="name"
          name="name"
          type="text"
          maxLength={LARGO_MAXIMO_NOMBRE_PROYECTO}
          value={formData.name}
          onChange={handleChange}
          required
          className={INPUT_CLASS}
        />
      </FormField>
      <FormField id="url" label="Enlace del proyecto">
        <input
          id="url"
          name="url"
          type="text"
          inputMode="url"
          maxLength={LARGO_MAXIMO_ENLACE_PROYECTO}
          value={formData.url}
          onChange={handleChange}
          required
          aria-invalid={Boolean(urlError)}
          aria-describedby="error-url"
          className={claseCampo(INPUT_CLASS, urlError)}
        />
        <MensajeError id="error-url" mensaje={urlError} />
      </FormField>
      <FormField id="description" label="Descripción corta">
        <textarea
          id="description"
          name="description"
          maxLength={LARGO_MAXIMO_DESCRIPCION_PROYECTO}
          value={formData.description}
          onChange={handleChange}
          required
          className={`${INPUT_CLASS} min-h-24`}
        />
      </FormField>
      <FormField id="technologies" label="Tecnologías (opcional)">
        <input
          id="technologies"
          name="technologies"
          type="text"
          maxLength={LARGO_MAXIMO_TECNOLOGIAS_PROYECTO}
          value={formData.technologies}
          onChange={handleChange}
          className={INPUT_CLASS}
        />
      </FormField>

      <MensajeError id="error-project-save" mensaje={saveError} />
    </EditRecordLayout>
  );
}
