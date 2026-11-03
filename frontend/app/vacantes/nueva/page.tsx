'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BriefcaseBusiness, Save } from 'lucide-react';
import {
  configuredCompanyId,
  configuredCompanyName,
  createVacancy,
} from '../../../lib/api/vacantes';
import { saveLocalVacancy } from '../vacancy-data';

const AREAS = [
'Desarrollo de Software',
'Datos y Analítica',
'Infraestructura y Soporte',
'Ciberseguridad',
'Gestión de Proyectos',
'Otra área',
];

const hasBackendCompany =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    configuredCompanyId,
  );

export default function NuevaVacantePage() {
const router = useRouter();

const [title, setTitle] = useState('');
const [company, setCompany] = useState(configuredCompanyName);
const [area, setArea] = useState('');
const [location, setLocation] = useState('');
const [modality, setModality] = useState('');
const [description, setDescription] = useState('');
const [requirements, setRequirements] = useState('');
const [conditions, setConditions] = useState('');
const [errors, setErrors] = useState<string[]>([]);
const [saveError, setSaveError] = useState('');
const [saveNotice, setSaveNotice] = useState('');
const [isSaving, setIsSaving] = useState(false);

const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
event.preventDefault();
setErrors([]);
setSaveError('');
setSaveNotice('');


const newErrors: string[] = [];

if (!title.trim()) newErrors.push('El cargo de la vacante es obligatorio.');
if (!company.trim()) newErrors.push('El nombre de la empresa es obligatorio.');
if (!area) newErrors.push('Selecciona un área profesional.');
if (!location.trim()) newErrors.push('La ubicación es obligatoria.');
if (!modality) newErrors.push('Selecciona una modalidad de trabajo.');
if (!description.trim()) newErrors.push('La descripción es obligatoria.');
if (!requirements.trim()) newErrors.push('Debes registrar al menos un requisito.');
if (!conditions.trim()) newErrors.push('Las condiciones de trabajo son obligatorias.');
if (title.trim().length > 100) {
  newErrors.push('El cargo no puede superar los 100 caracteres.');
}

if (description.trim().length < 20) {
  newErrors.push('La descripción debe tener al menos 20 caracteres.');
}

if (newErrors.length > 0) {
  setErrors(newErrors);
  return;
}

    try {
      setIsSaving(true);
      const inputRequirements = requirements
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);

      if (hasBackendCompany) {
        const vacancy = await createVacancy({
          idEmpresa: configuredCompanyId,
          titulo: title.trim(),
          modalidad: modality,
          descripcion: description.trim(),
          ubicacion: location.trim(),
          area,
          condiciones: conditions.trim(),
          requisitos: inputRequirements,
        });

        router.push(
          `/vacantes/nueva/requisitos?id=${encodeURIComponent(vacancy.id)}&titulo=${encodeURIComponent(vacancy.titulo)}`,
        );
      } else {
        const vacancy = saveLocalVacancy({
          title: title.trim(),
          company: company.trim(),
          area,
          location: location.trim(),
          modality,
          description: description.trim(),
          requirements: inputRequirements,
          conditions: conditions.trim(),
          availability: 'available',
        });

        router.push(`/vacantes/${encodeURIComponent(String(vacancy.id))}`);
      }
      router.refresh();
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('No se pudo conectar con el servicio de vacantes.')
      ) {
        try {
          const vacancy = saveLocalVacancy({
            title: title.trim(),
            company: company.trim(),
            area,
            location: location.trim(),
            modality,
            description: description.trim(),
            requirements: requirements
              .split('\n')
              .map((item) => item.trim())
              .filter(Boolean),
            conditions: conditions.trim(),
            availability: 'available',
          });

          setSaveNotice(
            'El servicio no está disponible. La vacante se guardó en este navegador para que puedas revisar su detalle.',
          );
          router.push(`/vacantes/${encodeURIComponent(String(vacancy.id))}`);
          return;
        } catch (localError) {
          setSaveError(
            localError instanceof Error
              ? `No se pudo conectar con el servicio y tampoco guardar la vacante localmente: ${localError.message}`
              : 'No se pudo conectar con el servicio ni guardar la vacante localmente.',
          );
          return;
        }
      }

      setSaveError(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la vacante. Inténtalo nuevamente.',
      );
    } finally {
      setIsSaving(false);
    }
  };

return ( <main className="min-h-screen bg-[#f1eee4] px-5 py-8 sm:px-8"> <div className="mx-auto max-w-4xl"> <Link
       href="/vacantes"
       className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-orange-600"
     > <ArrowLeft size={17} />
Volver a vacantes </Link>


    <div className="mb-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
        UMSSPIRA / Vacantes / Registrar
      </p>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-orange-100 p-3 text-orange-600">
            <BriefcaseBusiness size={26} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Registrar vacante
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Completa la información de la oportunidad laboral.
            </p>
          </div>
        </div>

        {!hasBackendCompany && (
          <p role="status" className="mb-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Modo de prueba: las vacantes se guardarán solo en este navegador y
            podrás abrir sus detalles, pero no se publicarán en el backend.
          </p>
        )}

      </div>
    </div>

    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-lg bg-white p-5 shadow-sm sm:p-8"
    >
      <p className="mb-6 text-sm text-gray-500">
        Los campos marcados con <span className="font-bold text-red-600">*</span> son obligatorios.
      </p>

      {errors.length > 0 && (
        <div
          role="alert"
          className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p className="mb-2 font-semibold">
            Revisa los siguientes campos:
          </p>
          <ul className="list-inside list-disc space-y-1">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {saveError && (
        <div role="alert" className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {saveError}
        </div>
      )}

      {saveNotice && (
        <p role="status" className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {saveNotice}
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="title" className="mb-2 block text-sm font-semibold text-gray-700">
            Cargo de la vacante <span className="text-red-600">*</span>
          </label>
          <input
            id="title"
            value={title}
            maxLength={100}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ej. Analista de Datos Junior"
            className="w-full rounded-md border border-gray-200 bg-blue-50 px-3 py-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>

        <div>
          <label htmlFor="company" className="mb-2 block text-sm font-semibold text-gray-700">
            Empresa <span className="text-red-600">*</span>
          </label>
          <input
            id="company"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            readOnly={hasBackendCompany}
            placeholder="Configura NEXT_PUBLIC_EMPRESA_NAME"
            className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-3 text-sm text-gray-700 outline-none"
          />
        </div>

        <div>
          <label htmlFor="area" className="mb-2 block text-sm font-semibold text-gray-700">
            Área profesional <span className="text-red-600">*</span>
          </label>
          <select
            id="area"
            value={area}
            onChange={(event) => setArea(event.target.value)}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-3 text-sm text-gray-800"
          >
            <option value="">Selecciona un área</option>
            {AREAS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="location" className="mb-2 block text-sm font-semibold text-gray-700">
            Ubicación <span className="text-red-600">*</span>
          </label>
          <input
            id="location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Ej. Cochabamba, Bolivia"
            className="w-full rounded-md border border-gray-200 bg-blue-50 px-3 py-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="modality" className="mb-2 block text-sm font-semibold text-gray-700">
            Modalidad de trabajo <span className="text-red-600">*</span>
          </label>
          <select
            id="modality"
            value={modality}
            onChange={(event) => setModality(event.target.value)}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-3 text-sm text-gray-800"
          >
            <option value="">Selecciona una modalidad</option>
            <option value="Presencial">Presencial</option>
            <option value="Híbrido">Híbrido</option>
            <option value="Remoto">Remoto</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="description" className="mb-2 block text-sm font-semibold text-gray-700">
            Descripción de la vacante <span className="text-red-600">*</span>
          </label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe las funciones y responsabilidades del puesto..."
            className="w-full resize-y rounded-md border border-gray-200 bg-blue-50 px-3 py-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-orange-300"
          />
          <p className="mt-1 text-xs text-gray-400">
            Mínimo 20 caracteres.
          </p>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="requirements" className="mb-2 block text-sm font-semibold text-gray-700">
            Requisitos del puesto <span className="text-red-600">*</span>
          </label>
          <textarea
            id="requirements"
            rows={4}
            value={requirements}
            onChange={(event) => setRequirements(event.target.value)}
            placeholder={'Escribe un requisito por línea:\nSQL básico\nExcel\nPensamiento analítico'}
            className="w-full resize-y rounded-md border border-gray-200 bg-blue-50 px-3 py-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-orange-300"
          />
          <p className="mt-1 text-xs text-gray-400">
            Introduce cada requisito en una línea diferente.
          </p>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="conditions" className="mb-2 block text-sm font-semibold text-gray-700">
            Condiciones de trabajo <span className="text-red-600">*</span>
          </label>
          <textarea
            id="conditions"
            rows={3}
            value={conditions}
            onChange={(event) => setConditions(event.target.value)}
            placeholder="Ej. Jornada completa, contrato inicial de 6 meses, beneficios..."
            className="w-full resize-y rounded-md border border-gray-200 bg-blue-50 px-3 py-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
      </div>

      <div className="mt-7 flex flex-col-reverse justify-end gap-3 sm:flex-row">
        <Link
          href="/mis-vacantes"
          className="rounded-md border border-gray-300 px-5 py-3 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-orange-400 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-500"
        >
          <Save size={17} />
          {isSaving ? 'Guardando...' : 'Guardar vacante'}
        </button>
      </div>
    </form>
  </div>
</main>
);
}
