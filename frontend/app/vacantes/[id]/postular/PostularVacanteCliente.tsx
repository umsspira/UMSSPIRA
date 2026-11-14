'use client';

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
ArrowLeft,
BriefcaseBusiness,
Building2,
FileText,
Send,
ShieldCheck,
} from 'lucide-react';
const APPLICATIONS_KEY = 'umsspira-postulaciones';
import {
  findVacancy,
  findVacancyIn,
  parseSavedVacancies,
  type Vacancy,
} from '../../vacancy-data';
import {
  SERVER_STORAGE_SNAPSHOT,
  STORAGE_READ_ERROR_SNAPSHOT,
  readVacancySnapshot,
  subscribeToLocalStorage,
} from '../../storage';
import {
  getVacancy,
  isVacancyAvailable,
  type Vacancy as ApiVacancy,
} from '../../../../lib/api/vacantes';

type Application = {
id: string;
code: string;
vacancyId: string;
vacancyTitle: string;
company: string;
applicantName: string;
email: string;
phone: string;
motivation: string;
authorized: boolean;
submittedAt: string;
status: 'Postulación enviada';
};

function createApplicationCode(existing: Application[]) {
const year = new Date().getFullYear();
let code = '';

do {
const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
code = `POS-${year}-${suffix}`;
} while (existing.some((application) => application.code === code));

return code;
}

function mapApiVacancy(vacancy: ApiVacancy): Vacancy {
  return {
    id: vacancy.id,
    title: vacancy.titulo,
    company: vacancy.empresa,
    area: vacancy.area,
    location: vacancy.ubicacion,
    modality: vacancy.modalidad,
    description: vacancy.descripcion,
    requirements: vacancy.requisitos.map((requirement) => requirement.nombre),
    conditions: vacancy.condiciones,
    createdAt: vacancy.fechaCreacion ?? undefined,
    availability: 'available',
  };
}

export default function PostularVacanteCliente({
  id,
}: {
  id: string;
}) {
  const router = useRouter();
  const vacancyId = id;

const snapshot = useSyncExternalStore(
  subscribeToLocalStorage,
  readVacancySnapshot,
  () => SERVER_STORAGE_SNAPSHOT,
);
const {
  vacancy: localVacancy,
  loaded,
  loadError,
} = useMemo(() => {
  if (snapshot === SERVER_STORAGE_SNAPSHOT) {
    return { vacancy: null, loaded: false, loadError: '' };
  }

  if (snapshot === STORAGE_READ_ERROR_SNAPSHOT) {
    return {
      vacancy: null,
      loaded: true,
      loadError: 'No se pudo acceder al almacenamiento local del navegador.',
    };
  }

  try {
    return {
      vacancy: findVacancyIn(vacancyId, parseSavedVacancies(snapshot)) ?? null,
      loaded: true,
      loadError: '',
    };
  } catch {
    return {
      vacancy: null,
      loaded: true,
      loadError: 'No se pudieron leer las vacantes guardadas en este navegador.',
    };
  }
}, [snapshot, vacancyId]);
const [remoteResult, setRemoteResult] = useState<{
  id: string;
  vacancy: Vacancy | null;
  error: string;
} | null>(null);
const [name, setName] = useState('');
const [email, setEmail] = useState('');
const [phone, setPhone] = useState('');
const [motivation, setMotivation] = useState('');
const [authorized, setAuthorized] = useState(false);
const [errors, setErrors] = useState<string[]>([]);
const [saveError, setSaveError] = useState('');

useEffect(() => {
  if (!loaded || localVacancy) return;

  let active = true;

  getVacancy(vacancyId)
    .then((result) => {
      if (!active) return;
      if (!isVacancyAvailable(result.estado)) {
        setRemoteResult({
          id: vacancyId,
          vacancy: null,
          error: 'Esta vacante ya no está disponible para postulaciones.',
        });
        return;
      }
      setRemoteResult({
        id: vacancyId,
        vacancy: mapApiVacancy(result),
        error: '',
      });
    })
    .catch((requestError: unknown) => {
      if (!active) return;
      setRemoteResult({
        id: vacancyId,
        vacancy: null,
        error:
          requestError instanceof Error
            ? requestError.message
            : 'No se pudo cargar la vacante.',
      });
    });

  return () => {
    active = false;
  };
}, [loaded, localVacancy, vacancyId]);

const remoteData = remoteResult?.id === vacancyId ? remoteResult : null;
const vacancy = localVacancy ?? remoteData?.vacancy ?? null;
const isLoading = !loaded || (!localVacancy && !remoteData);
const vacancyLoadError = loadError || remoteData?.error || '';

const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
event.preventDefault();
setErrors([]);
setSaveError('');


const newErrors: string[] = [];

if (!name.trim()) newErrors.push('Escribe tu nombre completo.');
if (!email.trim()) {
  newErrors.push('El correo electrónico es obligatorio.');
} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
  newErrors.push('Introduce un correo electrónico válido.');
}

if (!phone.trim()) newErrors.push('El teléfono de contacto es obligatorio.');
if (!motivation.trim()) {
  newErrors.push('Explica brevemente tu interés en la vacante.');
} else if (motivation.trim().length < 20) {
  newErrors.push('La motivación debe tener al menos 20 caracteres.');
}

if (!authorized) {
  newErrors.push('Debes autorizar el uso de tu perfil para continuar.');
}

if (!vacancy) {
  newErrors.push('No se encontró la vacante seleccionada.');
}

if (newErrors.length > 0) {
  setErrors(newErrors);
  return;
}

let currentVacancy: Vacancy | undefined;
try {
  currentVacancy = findVacancy(vacancyId) ?? vacancy ?? undefined;
} catch {
  setSaveError(
    'No se pudo verificar la disponibilidad de esta vacante. Inténtalo de nuevo.',
  );
  return;
}

if (!currentVacancy) {
  setErrors(['Esta vacante ya no está disponible para postulaciones.']);
  return;
}

try {
  const savedApplications = localStorage.getItem(APPLICATIONS_KEY);
  const parsed: unknown = savedApplications
    ? JSON.parse(savedApplications)
    : [];

  if (!Array.isArray(parsed)) {
    throw new Error('El formato de las postulaciones guardadas no es válido.');
  }

  const applications = parsed as Application[];

  const alreadyApplied = applications.some(
    (application) =>
      String(application.vacancyId) === vacancyId &&
      application.email.toLowerCase() === email.trim().toLowerCase(),
  );

  if (alreadyApplied) {
    setErrors([
      'Ya existe una postulación para esta vacante con ese correo electrónico.',
    ]);
    return;
  }

  const application: Application = {
    id: `app-${Date.now()}`,
    code: createApplicationCode(applications),
    vacancyId,
    vacancyTitle: currentVacancy.title,
    company: currentVacancy.company,
    applicantName: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    motivation: motivation.trim(),
    authorized,
    submittedAt: new Date().toISOString(),
    status: 'Postulación enviada',
  };

  localStorage.setItem(
    APPLICATIONS_KEY,
    JSON.stringify([...applications, application]),
  );

  router.push(
    `/postulaciones/confirmacion?codigo=${encodeURIComponent(application.code)}`,
  );
} catch {
  setSaveError(
    'No se pudo guardar la postulación en este navegador. Inténtalo de nuevo.',
  );
}


};

if (isLoading) {
return ( <main className="min-h-screen bg-[#f1eee4] px-5 py-10"> <p className="text-center text-gray-600">Cargando vacante...</p> </main>
);
}

if (!vacancy) {
return ( <main className="min-h-screen bg-[#f1eee4] px-5 py-10"> <div className="mx-auto max-w-2xl rounded-lg bg-white p-8 text-center shadow-sm"> <h1 className="text-2xl font-bold text-gray-800">{vacancyLoadError ? 'No se puede postular a esta vacante' : 'Vacante no encontrada'}</h1> <p role={vacancyLoadError ? 'alert' : undefined} className="mt-3 text-sm text-gray-600">{vacancyLoadError || 'Es posible que la vacante no exista o ya no esté disponible.'}</p><Link
         href="/vacantes"
         className="mt-5 inline-flex items-center gap-2 rounded-md bg-orange-400 px-4 py-3 font-semibold text-white"
       > <ArrowLeft size={17} /> Volver a vacantes </Link> </div> </main>
);
}

return ( <main className="min-h-screen bg-[#f1eee4] px-5 py-8 sm:px-8"> <div className="mx-auto max-w-4xl">
<Link
href={`/vacantes/${vacancy.id}`}
className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-orange-600"
> <ArrowLeft size={17} /> Volver al detalle </Link>


    <div className="mb-6 flex items-center gap-3">
      <div className="rounded-lg bg-orange-100 p-3 text-orange-600">
        <FileText size={27} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          UMSSPIRA / Postulaciones
        </p>
        <h1 className="text-3xl font-bold text-gray-800">
          Confirma tu postulación
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Revisa la oportunidad y completa tus datos antes de enviar.
        </p>
      </div>
    </div>

    <section className="mb-6 rounded-lg border border-orange-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-orange-50 p-3 text-orange-500">
          <BriefcaseBusiness size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">{vacancy.title}</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-gray-600">
            <Building2 size={16} /> {vacancy.company}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            {vacancy.area} · {vacancy.location} · {vacancy.modality}
          </p>
        </div>
      </div>
    </section>

    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-lg bg-white p-5 shadow-sm sm:p-8"
    >
      <p className="mb-6 text-sm text-gray-500">
        Los campos marcados con * son obligatorios.
      </p>

      {errors.length > 0 && (
        <div
          role="alert"
          className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p className="mb-2 font-semibold">No se pudo enviar la postulación:</p>
          <ul className="list-inside list-disc space-y-1">
            {errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </div>
      )}

      {saveError && (
        <p role="alert" className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {saveError}
        </p>
      )}

      <h2 className="mb-4 text-lg font-bold text-gray-800">
        Tus datos de contacto
      </h2>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700">
          Nombre completo *
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            maxLength={120}
            className="mt-2 w-full rounded-md border border-gray-200 px-3 py-3 outline-none focus:border-orange-400"
            placeholder="Ej. Juan Pérez"
          />
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Correo electrónico *
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            maxLength={160}
            className="mt-2 w-full rounded-md border border-gray-200 px-3 py-3 outline-none focus:border-orange-400"
            placeholder="tu@correo.com"
          />
        </label>

        <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
          Teléfono de contacto *
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="tel"
            maxLength={30}
            className="mt-2 w-full rounded-md border border-gray-200 px-3 py-3 outline-none focus:border-orange-400"
            placeholder="Ej. 70000000"
          />
        </label>
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700">
          ¿Por qué te interesa esta vacante? *
          <textarea
            value={motivation}
            onChange={(event) => setMotivation(event.target.value)}
            rows={5}
            maxLength={1500}
            className="mt-2 w-full resize-y rounded-md border border-gray-200 px-3 py-3 outline-none focus:border-orange-400"
            placeholder="Cuéntale a la empresa cómo tu perfil se relaciona con esta oportunidad..."
          />
          <span className="mt-1 block text-right text-xs text-gray-400">
            {motivation.length}/1500 caracteres
          </span>
        </label>
      </div>

      <div className="mt-7 rounded-lg border border-blue-100 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck size={22} className="mt-0.5 shrink-0 text-blue-700" />
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-gray-700">
            <input
              type="checkbox"
              checked={authorized}
              onChange={(event) => setAuthorized(event.target.checked)}
              className="mt-1 h-4 w-4 accent-orange-500"
            />
            <span>
              <strong>Autorización obligatoria: </strong>
              autorizo que mi perfil y los documentos asociados sean compartidos
              con la empresa responsable de esta vacante para evaluar mi
              postulación. *
            </span>
          </label>
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-gray-500">
        Esta versión es una demostración: los datos se guardan únicamente en
        el almacenamiento local de este navegador. La integración con el
        backend y la base de datos compartida queda pendiente.
      </p>

      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href={`/vacantes/${vacancy.id}`}
          className="inline-flex items-center justify-center rounded-md border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-orange-400 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-500"
        >
          <Send size={17} />
          Enviar postulación
        </button>
      </div>
    </form>
  </div>
</main>


);
}
