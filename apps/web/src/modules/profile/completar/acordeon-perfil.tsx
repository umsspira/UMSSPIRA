
'use client';
 
import { useEffect, useMemo, useRef, useState } from 'react';
import { Briefcase, Check, FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarraProgreso } from './barra-progreso';
import { SeccionAcordeon } from './seccion-acordeon';
import { FormularioExperiencia, type Experiencia } from './experiencia-laboral';
import { FormacionAcademicaForm, type FormacionAcademica } from './formacion-academica';
import { FormularioCertificaciones, type Certificacion } from './certificaciones';
import { FormularioDescripcion } from './descripcion-profesional';
import { FormularioProyectos, type Proyecto } from './proyectos';
import {
  crearCertificacion,
  crearExperiencia,
  crearFormacion,
  crearProyecto,
  guardarDescripcion,
  subirRespaldo,
} from '@/modules/profile/services/perfil-api';
import { DeleteRecordModal } from '@/modules/profile/components/delete-record-modal';
import { ProfileQuickLinks } from '@/modules/profile/components/profile-quick-links';
import { DeleteRecordException, deleteProfileRecord } from '@/modules/profile/services/profile-records-service';
import { useProfileStore } from '@/modules/profile/state/profile-store';
import {
  type DraftDataBySection,
  type DraftSection,
  DraftsStoreProvider,
  useDraftsStore,
} from '@/modules/profile/state/drafts-store';
import { loadDrafts } from '@/modules/profile/utils/drafts-storage';
import { BackButton } from '@/shared/components/back-button';
import { crearIdOperacion } from '@/modules/profile/utils/certification-operation';
import { urlDeArchivo } from '@/modules/profile/utils/backup-url';
import { backupTypeOf } from '@/modules/profile/utils/validate-backup-file';
import {
  profileCompleteness,
  type CompletenessSectionId,
} from '@/modules/profile/utils/profile-completeness';
import type {
  CertificationRecord,
  EducationRecord,
  DeleteRecordErrorCode,
  ExperienceRecord,
  ProjectRecord,
} from '@/modules/profile/types/profile-record';
 
// Pantalla donde se ven y retoman los borradores (la misma lista de «Agregar registros»)
export const BORRADORES_ROUTE = '/profile/registros/agregar';
export const MENSAJE_BORRADOR_VACIO = 'No se puede guardar el borrador: no hay ningún registro.';

const SECCIONES_BORRADOR: DraftSection[] = ['education', 'experience', 'certification', 'project'];

// Algún campo escrito o un respaldo elegido
function tieneDatos(datos: DraftDataBySection[DraftSection] | undefined): boolean {
  if (!datos) return false;
  return Object.entries(datos).some(
    ([campo, valor]) => campo !== 'id' && (typeof valor === 'string' ? valor.trim() !== '' : valor != null),
  );
}

type AcordeonPerfilProps = {
  returnTo?: string;
  seccionInicial?: CompletenessSectionId;
};

// returnTo: ruta interna desde la que se llegó (por ejemplo /afinidad); al terminar se vuelve ahí (E2.3).
// seccionInicial: sección que se abre al llegar desde el indicador de completitud (T6.6)
// Los borradores se guardan en el navegador con el mismo estado que «Agregar registros», así «Ver borradores» los muestra
export function AcordeonPerfil(props: AcordeonPerfilProps) {
  return (
    <DraftsStoreProvider>
      <AcordeonPerfilContenido {...props} />
    </DraftsStoreProvider>
  );
}

function AcordeonPerfilContenido({ returnTo, seccionInicial }: AcordeonPerfilProps) {
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
    addProject,
    setDescription,
    removeRecord,
    updateRecord,
  } = useProfileStore();
  const router = useRouter();
  const [avisoBorrador, setAvisoBorrador] = useState(false);
  const { drafts, saveIncompleteDraft, removeDraft } = useDraftsStore();
  // Lo escrito en cada formulario, para guardarlo como borrador
  const datosFormularios = useRef<Partial<DraftDataBySection>>({});
  const [hayDatos, setHayDatos] = useState(false);
  // Datos con los que arranca cada formulario: el borrador guardado antes (se lee del navegador al montar)
  const [inicio, setInicio] = useState<Partial<DraftDataBySection> | null>(null);

  useEffect(() => {
    const guardados = loadDrafts().filter((borrador) => borrador.isIncomplete);
    const datos: Partial<DraftDataBySection> = {};
    for (const borrador of guardados) {
      (datos as Record<DraftSection, unknown>)[borrador.section] = borrador.data;
    }
    setInicio(datos);
  }, []);

  const seguirDatos = useMemo(() => {
    function seguir<S extends DraftSection>(seccion: S) {
      return (datos: DraftDataBySection[S]) => {
        datosFormularios.current[seccion] = datos;
        setHayDatos(SECCIONES_BORRADOR.some((s) => tieneDatos(datosFormularios.current[s])));
      };
    }
    return {
      education: seguir('education'),
      experience: seguir('experience'),
      certification: seguir('certification'),
      project: seguir('project'),
    };
  }, []);

  // «Guardar borrador»: lo escrito en cada sección queda como borrador (uno por sección) y se conserva al recargar
  function guardarBorrador() {
    if (!hayDatos) return;
    for (const seccion of SECCIONES_BORRADOR) {
      const datos = datosFormularios.current[seccion];
      const anterior = drafts.find((borrador) => borrador.section === seccion && borrador.isIncomplete);
      if (tieneDatos(datos)) saveIncompleteDraft(seccion, datos as DraftDataBySection[typeof seccion]);
      else if (anterior) removeDraft(anterior.id);
    }
    setAvisoBorrador(true);
  }

  // Un registro ya guardado en la API deja de ser borrador
  function quitarBorradorDe(seccion: DraftSection) {
    const anterior = drafts.find((borrador) => borrador.section === seccion && borrador.isIncomplete);
    if (anterior) removeDraft(anterior.id);
  }

  const claveFormulario = inicio ? 'restaurado' : 'nuevo';
  // Errores sin corregir por sección, para el contador del encabezado (HU-02, AC 6)
  const [erroresFormacion, setErroresFormacion] = useState(0);
  const [erroresExperiencia, setErroresExperiencia] = useState(0);
  const [erroresCertificaciones, setErroresCertificaciones] = useState(0);
  const [erroresProyectos, setErroresProyectos] = useState(0);
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
  // Id de la última certificación guardada, para «Cambiar respaldo» (T18.1)
  const ultimaGuardadaRef = useRef<string | null>(null);
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
 
  // HU-19: proyectos ya guardados, para listarlos en la sección 5
  const proyectos = useMemo<Proyecto[]>(
    () =>
      (records.project as ProjectRecord[]).map((registro) => ({
        nombre: registro.name,
        enlace: registro.url,
        descripcion: registro.description,
        tecnologias: registro.technologies ?? '',
      })),
    [records.project],
  );

  // Mismo cálculo que el indicador del resumen: las 4 secciones de registros y la descripción
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
            {/* Sin returnTo se vuelve a Mi perfil (HU-11) */}
            <BackButton href="/profile" returnTo={returnTo} ariaLabel={returnTo ? 'Volver' : 'Volver a Mi perfil'} />
          </div>
        </div>
        <BarraProgreso completas={completas} total={secciones.length} />
        <ProfileQuickLinks />
      </header>
 
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex flex-col gap-4 lg:w-[300px] lg:shrink-0">
        {/* Tarjeta informativa (HU-21, CA-08: «Tu base de datos de titulado») */}
        <aside className="flex flex-col gap-4 rounded-2xl border border-abyssal-blue/10 bg-white p-6">
          <h2 className="text-lg font-bold text-blue-fantastic">Tu base de datos de titulado</h2>
          <p className="text-[13px] leading-[1.5] text-blue-fantastic/70">
            La información registrada se consolida en un formato estructurado (JSON base) para fines de
            acreditación universitaria y bolsa de empleo oficial de la UMSS.
          </p>
          <div className="flex flex-col gap-3 border-t border-oatmeal pt-4">
            <h3 className="text-sm font-bold uppercase text-blue-fantastic">¿Por qué es importante?</h3>
            <p className="flex gap-2 text-[13px] text-blue-fantastic/80">
              <Briefcase className="h-4 w-4 shrink-0 text-truffle-trouble" aria-hidden="true" />
              Acceso directo a las ofertas laborales de las empresas aliadas a Jalasoft y UMSS.
            </p>
          </div>
        </aside>
        {/* Sugerencia del equipo: acceso directo a los borradores guardados */}
        <Link
          href={BORRADORES_ROUTE}
          className="flex items-center justify-center gap-2 rounded-2xl border border-abyssal-blue/10 bg-white px-6 py-4 text-sm font-semibold text-blue-fantastic transition hover:bg-palladian"
        >
          <FileText className="h-4 w-4 text-truffle-trouble" aria-hidden="true" />
          Ver borradores
          <span className="rounded-[10px] bg-burning-flame/[0.16] px-2 py-0.5 text-xs font-semibold text-truffle-trouble">
            {drafts.length}
          </span>
        </Link>
        </div>
 
        <div className="flex min-w-0 flex-1 flex-col gap-4">
 
      <SeccionAcordeon
        numero={1}
        abiertaInicial={seccionInicial === 'formacion-academica'}
        titulo="Formación académica"
        descripcion="Tu formación académica principal"
        cantidad={formaciones.length}
        errores={erroresFormacion}
      >
        {(cerrar) => (
        <FormacionAcademicaForm
          key={claveFormulario}
          valoresIniciales={inicio?.education}
          onDatosChange={seguirDatos.education}
          formaciones={formaciones}
          onErroresChange={setErroresFormacion}
          onCancelar={cerrar}
          onAgregar={async (formacion) => {
            // Solo se agrega al estado lo que la API guardó (201), con su id real
            addEducation(await crearFormacion(formacion));
            quitarBorradorDe('education');
          }}
        />
        )}
      </SeccionAcordeon>
      <SeccionAcordeon
        numero={2}
        abiertaInicial={seccionInicial === 'experiencia-laboral'}
        titulo="Experiencia laboral"
        descripcion="Tu experiencia profesional más relevante"
        cantidad={experiencias.length}
        errores={erroresExperiencia}
      >
        {(cerrar) => (
        <FormularioExperiencia
          key={claveFormulario}
          valoresIniciales={inicio?.experience}
          onDatosChange={seguirDatos.experience}
          experiencias={experiencias}
          onErroresChange={setErroresExperiencia}
          onCancelar={cerrar}
          onAgregar={async (experiencia) => {
            // Solo se agrega al estado lo que la API guardó (201), con su id real
            addExperience(await crearExperiencia(experiencia));
            quitarBorradorDe('experience');
          }}
        />
        )}
      </SeccionAcordeon>
      <SeccionAcordeon
        numero={3}
        abiertaInicial={seccionInicial === 'certificaciones'}
        titulo="Certificaciones"
        descripcion="Credenciales que respaldan tu perfil"
        cantidad={certificaciones.length}
        errores={erroresCertificaciones}
      >
        {(cerrar) => (
        <FormularioCertificaciones
          key={claveFormulario}
          valoresIniciales={inicio?.certification}
          onDatosChange={seguirDatos.certification}
          certificaciones={certificaciones}
          onErroresChange={setErroresCertificaciones}
          returnTo={returnTo}
          progreso={progresoSubida}
          onCancelar={() => {
            // Si la certificación ya se creó y solo falló la foto, sigue guardada: se muestra y no se borra (T8.6)
            const creada = pendienteRef.current?.creada;
            if (creada) addCertification(creada);
            pendienteRef.current = null;
            // HU-21, CA-06: se limpia, se cierra la sección y se sigue en Completar perfil
            cerrar();
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
              backupType: certificacion.respaldo ? backupTypeOf(certificacion.respaldo) : undefined,
            });
            ultimaGuardadaRef.current = creada.id;
            quitarBorradorDe('certification');
          }}
          onCambiarRespaldo={async (archivo) => {
            // HU-18 (T18.1): mismo endpoint de subida; el backend reemplaza el respaldo de ese registro
            const id = ultimaGuardadaRef.current;
            const registro = (records.certification as CertificationRecord[]).find((r) => r.id === id);
            if (!id || !registro) return;
            setProgresoSubida(undefined);
            await subirRespaldo(id, archivo, setProgresoSubida);
            updateRecord('certification', {
              ...registro,
              backupFile: archivo.name,
              backupUrl: urlDeArchivo(archivo),
              backupVerified: false,
              backupType: backupTypeOf(archivo),
            });
          }}
        />
        )}
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
        {(cerrar) => (
        <FormularioDescripcion
          descripcion={description}
          onCancelar={cerrar}
          onGuardar={async (descripcion) => {
            // El resumen muestra lo que la API guardó; si falla, el estado no cambia
            setDescription(await guardarDescripcion(descripcion));
          }}
        />
        )}
      </SeccionAcordeon>
      {/* HU-19 (T19.1): sección 5 «Proyectos y portafolio» */}
      <SeccionAcordeon
        numero={5}
        abiertaInicial={seccionInicial === 'proyectos'}
        titulo="Proyectos y portafolio"
        descripcion="Tus proyectos y trabajos publicados"
        cantidad={proyectos.length}
        errores={erroresProyectos}
      >
        {(cerrar) => (
        <FormularioProyectos
          key={claveFormulario}
          valoresIniciales={inicio?.project}
          onDatosChange={seguirDatos.project}
          proyectos={proyectos}
          onErroresChange={setErroresProyectos}
          onCancelar={cerrar}
          onAgregar={async (proyecto) => {
            // Solo se agrega al estado lo que la API guardó (201), con su id real
            addProject(await crearProyecto(proyecto));
            quitarBorradorDe('project');
          }}
        />
        )}
      </SeccionAcordeon>

          {/* Acciones finales (v3) */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="button"
              // Sin returnTo vuelve al resumen con el aviso «Se guardó correctamente» (HU-21, CA-01)
              onClick={() => router.push(returnTo ?? '/profile?guardado=1')}
              className="h-12 flex-1 rounded-lg bg-burning-flame text-base font-bold text-abyssal-blue transition hover:brightness-95"
            >
              Guardar perfil profesional
            </button>
            <button
              type="button"
              onClick={guardarBorrador}
              disabled={!hayDatos}
              aria-describedby={hayDatos ? undefined : 'motivo-borrador-vacio'}
              className="h-12 rounded-lg border border-oatmeal bg-white px-6 text-sm font-semibold text-blue-fantastic transition hover:bg-palladian disabled:cursor-not-allowed disabled:opacity-50"
            >
              Guardar borrador
            </button>
          </div>
          {!hayDatos && (
            <p id="motivo-borrador-vacio" className="text-xs text-blue-fantastic/60 sm:text-right">
              {MENSAJE_BORRADOR_VACIO}
            </p>
          )}
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
 
