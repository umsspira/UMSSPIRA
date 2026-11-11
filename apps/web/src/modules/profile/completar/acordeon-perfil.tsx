
'use client';
 
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Briefcase, Check, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarraProgreso } from './barra-progreso';
import { SeccionAcordeon } from './seccion-acordeon';
import { FormularioExperiencia, type Experiencia } from './experiencia-laboral';
import { FormacionAcademicaForm, type FormacionAcademica } from './formacion-academica';
import { FormularioCertificaciones, type Certificacion } from './certificaciones';
import { FormularioDescripcion } from './descripcion-profesional';
import {
  crearCertificacion,
  crearExperiencia,
  crearFormacion,
  guardarDescripcion,
  subirRespaldo,
} from '@/modules/profile/services/perfil-api';
import { DeleteRecordModal } from '@/modules/profile/components/delete-record-modal';
import { DeleteRecordException, deleteProfileRecord } from '@/modules/profile/services/profile-records-service';
import { useProfileStore } from '@/modules/profile/state/profile-store';
import { crearIdOperacion } from '@/modules/profile/utils/certification-operation';
import { urlDeArchivo } from '@/modules/profile/utils/backup-url';
import {
  profileCompleteness,
  type CompletenessSectionId,
} from '@/modules/profile/utils/profile-completeness';
import type {
  CertificationRecord,
  EducationRecord,
  DeleteRecordErrorCode,
  ExperienceRecord,
} from '@/modules/profile/types/profile-record';
 
// returnTo: ruta interna desde la que se llegó (por ejemplo /afinidad); al terminar se vuelve ahí (E2.3).
// seccionInicial: sección que se abre al llegar desde el indicador de completitud (T6.6)
export function AcordeonPerfil({
  returnTo,
  seccionInicial,
}: {
  returnTo?: string;
  seccionInicial?: CompletenessSectionId;
}) {
  // Los registros vienen del estado compartido del perfil, así lo agregado aquí aparece en el resumen
  const {
    records,
    description,
    isLoading,
    loadError,
    retryLoad,
    addEducation,
    addExperience,
    addCertification,
    setDescription,
    removeRecord,
  } = useProfileStore();
  const router = useRouter();
  const [avisoBorrador, setAvisoBorrador] = useState(false);
  // Errores sin corregir por sección, para el contador del encabezado (HU-02, AC 6)
  const [erroresFormacion, setErroresFormacion] = useState(0);
  const [erroresExperiencia, setErroresExperiencia] = useState(0);
  const [erroresCertificaciones, setErroresCertificaciones] = useState(0);
  // Avance (0 a 100) de la subida del respaldo mientras se guarda una certificación
  const [progresoSubida, setProgresoSubida] = useState<number>();
  // Certificación que se va a eliminar desde Completar perfil (BUG HU8-02), con el mismo modal que Mis registros
  const [certificacionAEliminar, setCertificacionAEliminar] = useState<CertificationRecord | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<DeleteRecordErrorCode | null>(null);

  async function confirmarEliminar() {
    if (!certificacionAEliminar) return;
    setEliminando(true);
    setErrorEliminar(null);
    try {
      // El servicio avisa a la Épica 3 que hay cambios pendientes para el radar
      await deleteProfileRecord('certification', certificacionAEliminar);
      removeRecord('certification', certificacionAEliminar.id);
      setCertificacionAEliminar(null);
    } catch (error) {
      setErrorEliminar(error instanceof DeleteRecordException ? error.code : 'network');
    } finally {
      setEliminando(false);
    }
  }
  // Certificación ya creada cuyo respaldo no se pudo subir: al reintentar se sube solo la foto, sin duplicar (T8.6)
  const pendienteRef = useRef<{ clave: string; idOperacion: string; creada?: CertificationRecord } | null>(null);
 
  useEffect(() => {
    if (!avisoBorrador) return;
    const temporizador = setTimeout(() => setAvisoBorrador(false), 3000);
    return () => clearTimeout(temporizador);
  }, [avisoBorrador]);
 
  const formaciones = useMemo<FormacionAcademica[]>(
    () =>
      (records.education as EducationRecord[]).map((registro) => ({
        institucion: registro.institution,
        titulo: registro.title,
        anioEgreso: registro.graduationYear,
        grado: registro.degree,
      })),
    [records.education],
  );
 
  const experiencias = useMemo<Experiencia[]>(
    () =>
      (records.experience as ExperienceRecord[]).map((registro) => ({
        empresa: registro.company,
        cargo: registro.position,
        fechaInicio: registro.startDate,
        fechaFin: registro.endDate || undefined,
      })),
    [records.experience],
  );
 
  const certificaciones = useMemo<Certificacion[]>(
    () =>
      (records.certification as CertificationRecord[]).map((registro) => ({
        id: registro.id,
        nombre: registro.name,
        entidadEmisora: registro.issuer,
        anioEmision: registro.issueYear,
        grado: registro.degree,
        respaldo: registro.backupFile ? new File([], registro.backupFile) : null,
      })),
    [records.certification],
  );
 
  // Mismo cálculo que el indicador del resumen: las 3 secciones de registros y la descripción
  const secciones = profileCompleteness(records, description).sections;
  const completas = secciones.filter((seccion) => seccion.complete).length;
 
  // Los formularios se habilitan solo con el perfil ya cargado: si se guardara antes, la respuesta
  // inicial (más vieja) reemplazaría la lista y ocultaría lo recién guardado. Si falla, se reintenta
  if (isLoading || loadError) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-blue-fantastic md:text-[28px]">Completar Perfil Profesional</h1>
        {isLoading ? (
          <p role="status" className="rounded-2xl border border-abyssal-blue/10 bg-white px-6 py-10 text-center text-sm text-blue-fantastic/70">
            Cargando tu perfil…
          </p>
        ) : (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl border border-abyssal-blue/10 bg-white px-6 py-6 text-sm">
            <p>No se pudo cargar tu perfil. {loadError}</p>
            <button
              type="button"
              onClick={retryLoad}
              className="rounded-lg bg-burning-flame px-4 py-2 font-bold text-abyssal-blue"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera con progreso (v3: "Completar Perfil Profesional") */}
      <header className="flex flex-col gap-4 rounded-2xl border border-abyssal-blue/10 bg-white px-5 py-5 md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-bold text-blue-fantastic md:text-[28px]">Completar Perfil Profesional</h1>
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-semibold text-truffle-trouble">
              {completas} de {secciones.length} secciones completas
            </span>
            {returnTo && (
              <Link
                href={returnTo}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-fantastic px-3 py-1.5 text-sm font-semibold text-blue-fantastic transition hover:bg-palladian"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Volver
              </Link>
            )}
          </div>
        </div>
        <BarraProgreso completas={completas} total={secciones.length} />
      </header>
 
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Tarjeta informativa (v3: "Tu Base de Datos Egresado") */}
        <aside className="flex flex-col gap-4 rounded-2xl border border-abyssal-blue/10 bg-white p-6 lg:w-[300px] lg:shrink-0">
          <h2 className="text-lg font-bold text-blue-fantastic">Tu Base de Datos Egresado</h2>
          <p className="text-[13px] leading-[1.5] text-blue-fantastic/70">
            La información registrada se consolida en un formato estructurado (JSON base) para fines de
            acreditación universitaria y bolsa de empleo oficial de la UMSS.
          </p>
          <div className="flex flex-col gap-3 border-t border-oatmeal pt-4">
            <h3 className="text-sm font-bold uppercase text-blue-fantastic">¿Por qué es importante?</h3>
            <p className="flex gap-2 text-[13px] text-blue-fantastic/80">
              <ShieldCheck className="h-4 w-4 shrink-0 text-truffle-trouble" aria-hidden="true" />
              Información certificada directamente por el departamento de posgrado.
            </p>
            <p className="flex gap-2 text-[13px] text-blue-fantastic/80">
              <Briefcase className="h-4 w-4 shrink-0 text-truffle-trouble" aria-hidden="true" />
              Acceso directo a las ofertas laborales de las empresas aliadas a Jalasoft y UMSS.
            </p>
          </div>
        </aside>
 
        <div className="flex min-w-0 flex-1 flex-col gap-4">
 
      <SeccionAcordeon
        numero={1}
        abiertaInicial={seccionInicial === 'formacion-academica'}
        titulo="Formación académica"
        descripcion="Tu formación académica principal"
        cantidad={formaciones.length}
        errores={erroresFormacion}
      >
        <FormacionAcademicaForm
          formaciones={formaciones}
          onErroresChange={setErroresFormacion}
          onAgregar={async (formacion) => {
            // Solo se agrega al estado lo que la API guardó (201), con su id real
            addEducation(await crearFormacion(formacion));
          }}
        />
      </SeccionAcordeon>
      <SeccionAcordeon
        numero={2}
        abiertaInicial={seccionInicial === 'experiencia-laboral'}
        titulo="Experiencia laboral"
        descripcion="Tu experiencia profesional más relevante"
        cantidad={experiencias.length}
        errores={erroresExperiencia}
      >
        <FormularioExperiencia
          experiencias={experiencias}
          onErroresChange={setErroresExperiencia}
          onAgregar={async (experiencia) => {
            // Solo se agrega al estado lo que la API guardó (201), con su id real
            addExperience(await crearExperiencia(experiencia));
          }}
        />
      </SeccionAcordeon>
      <SeccionAcordeon
        numero={3}
        abiertaInicial={seccionInicial === 'certificaciones'}
        titulo="Certificaciones"
        descripcion="Credenciales que respaldan tu perfil"
        cantidad={certificaciones.length}
        errores={erroresCertificaciones}
      >
        <FormularioCertificaciones
          certificaciones={certificaciones}
          onErroresChange={setErroresCertificaciones}
          returnTo={returnTo}
          progreso={progresoSubida}
          onCancelar={() => {
            // Si la certificación ya se creó y solo falló la foto, sigue guardada: se muestra y no se borra (T8.6)
            const creada = pendienteRef.current?.creada;
            if (creada) addCertification(creada);
            pendienteRef.current = null;
            router.push(returnTo ?? '/profile');
          }}
          hrefEditar={(id) => {
            // Al terminar de editar se vuelve a esta sección conservando el regreso a Afinidad (returnTo)
            const regreso = `/profile/completar?seccion=certificaciones${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''}`;
            return `/profile/certifications/${id}/edit?returnTo=${encodeURIComponent(regreso)}`;
          }}
          onEliminar={(id) => {
            setErrorEliminar(null);
            setCertificacionAEliminar(
              (records.certification as CertificationRecord[]).find((registro) => registro.id === id) ?? null,
            );
          }}
          onAgregar={async (certificacion) => {
            setProgresoSubida(undefined);
            const clave = JSON.stringify([
              certificacion.nombre,
              certificacion.entidadEmisora,
              certificacion.anioEmision,
              certificacion.grado,
            ]);
            // 1) se crea la certificación (o se reutiliza la que ya quedó creada) y 2) con su id se sube la foto
            if (!pendienteRef.current || pendienteRef.current.clave !== clave) {
              pendienteRef.current = { clave, idOperacion: crearIdOperacion() };
            }
            const intento = pendienteRef.current;
            const creada = intento.creada ?? await crearCertificacion(certificacion, intento.idOperacion);
            intento.creada = creada;
            if (certificacion.respaldo) {
              await subirRespaldo(creada.id, certificacion.respaldo, setProgresoSubida);
            }
            pendienteRef.current = null;
            // Solo se agrega al estado lo que la API guardó, con su id real
            addCertification({
              id: creada.id,
              name: creada.name,
              issuer: creada.issuer,
              issueYear: creada.issueYear,
              degree: creada.degree,
              // Un respaldo recién subido queda en revisión hasta que la administración lo valide
              backupFile: certificacion.respaldo?.name,
              backupUrl: urlDeArchivo(certificacion.respaldo),
              backupVerified: false,
            });
          }}
        />
      </SeccionAcordeon>
      {certificacionAEliminar && (
        <DeleteRecordModal
          section="certification"
          record={certificacionAEliminar}
          isDeleting={eliminando}
          errorCode={errorEliminar}
          onConfirm={() => void confirmarEliminar()}
          onCancel={() => setCertificacionAEliminar(null)}
        />
      )}
      <SeccionAcordeon
        numero={4}
        abiertaInicial={seccionInicial === 'descripcion-profesional'}
        titulo="Descripción profesional"
        descripcion="Un resumen de quién eres como profesional"
        cantidad={description ? 1 : 0}
        textoCompleto="(Completado)"
      >
        <FormularioDescripcion
          descripcion={description}
          onGuardar={async (descripcion) => {
            // El resumen muestra lo que la API guardó; si falla, el estado no cambia
            setDescription(await guardarDescripcion(descripcion));
          }}
        />
      </SeccionAcordeon>

          {/* Acciones finales (v3) */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={() => router.push(returnTo ?? '/profile')}
              className="h-12 flex-1 rounded-lg bg-burning-flame text-base font-bold text-abyssal-blue transition hover:brightness-95"
            >
              Guardar perfil profesional
            </button>
            <button
              type="button"
              onClick={() => setAvisoBorrador(true)}
              className="h-12 rounded-lg border border-oatmeal bg-white px-6 text-sm font-semibold text-blue-fantastic transition hover:bg-palladian"
            >
              Guardar borrador
            </button>
          </div>
        </div>
      </div>
 
      {avisoBorrador && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-abyssal-blue px-4 py-3 text-sm font-semibold text-white shadow-lg"
        >
          <Check className="h-4 w-4 text-burning-flame" aria-hidden="true" />
          Borrador guardado
        </div>
      )}
    </div>
  );
}
 
