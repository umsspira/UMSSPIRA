'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  getVacancy,
  indexVacancy,
  updateVacancy,
} from '../../../../lib/api/vacantes';
import {
  NIVELES_ESPERADOS,
  TIPOS_REQUISITO,
  type NivelEsperado,
  type RequisitoTecnico,
  type TipoRequisito,
} from '../../../../lib/vacancies/contracts';
import { technicalRequirementsClient } from '../../../../lib/vacancies/technical-requirements-client';
import {
  crearVacanteEditable,
  DESCRIPCION_MAX_CARACTERES,
  requisitoDuplicado,
  validarVacante,
  vacanteTieneCambios,
  type EstadoEdicion,
  type RequisitoTecnicoEditable,
  type VacanteEditable,
} from './vacante-edicion';

type Props = { id: string };

const estiloCampo =
  'mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100';

const estiloEtiqueta = 'block text-xs font-semibold text-slate-700';

function canonicalName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function requirementsMatch(
  current: RequisitoTecnico[],
  desired: RequisitoTecnicoEditable[],
) {
  if (current.length !== desired.length) return false;

  const currentByName = new Map(
    current.map((requirement) => [
      canonicalName(requirement.competencia),
      requirement,
    ]),
  );

  return desired.every((requirement) => {
    const saved = currentByName.get(canonicalName(requirement.competencia));
    return (
      saved !== undefined &&
      saved.nivel === requirement.nivel &&
      saved.tipo === requirement.tipo &&
      (saved.descripcion ?? '') === (requirement.descripcion ?? '')
    );
  });
}

export default function EditarVacanteForm({ id }: Props) {
  const [vacante, setVacante] = useState<VacanteEditable | null>(null);
  const [original, setOriginal] = useState<VacanteEditable | null>(null);
  const [requisitoNuevo, setRequisitoNuevo] = useState('');
  const [nivel, setNivel] = useState<NivelEsperado>('Avanzado');
  const [tipo, setTipo] = useState<TipoRequisito>('Obligatorio');
  const [estadoPantalla, setEstadoPantalla] =
    useState<EstadoEdicion>('cargando');
  const [mensajeError, setMensajeError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedKey, setLoadedKey] = useState('');
  const requestKey = `${id}:${reloadKey}`;

  useEffect(() => {
    let active = true;

    Promise.all([
      getVacancy(id),
      technicalRequirementsClient.obtenerRequisitosRemotos(id),
    ])
      .then(([vacancy, requirements]) => {
        if (!active) return;
        const editable = crearVacanteEditable(vacancy, requirements);
        setVacante(editable);
        setOriginal(editable);
        setEstadoPantalla('inicial');
        setMensajeError('');
        setLoadedKey(requestKey);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setVacante(null);
        setOriginal(null);
        setMensajeError(
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar los datos de la vacante.',
        );
        setEstadoPantalla('error');
        setLoadedKey(requestKey);
      });

    return () => {
      active = false;
    };
  }, [id, reloadKey, requestKey]);

  const hayCambios = vacanteTieneCambios(vacante, original);

  function actualizarVacante(cambios: Partial<VacanteEditable>) {
    setVacante((actual) => (actual ? { ...actual, ...cambios } : actual));
    setEstadoPantalla('pendiente');
    setMensajeError('');
  }

  function agregarRequisito() {
    if (!vacante) return;
    const competencia = requisitoNuevo.trim();

    if (competencia.length < 2) {
      setMensajeError('Ingresa un requisito técnico de al menos 2 caracteres.');
      setEstadoPantalla('error');
      return;
    }

    if (requisitoDuplicado(vacante.requisitos, competencia)) {
      setMensajeError('Este requisito ya está asociado a la vacante.');
      setEstadoPantalla('error');
      return;
    }

    actualizarVacante({
      requisitos: [...vacante.requisitos, { competencia, nivel, tipo }],
    });
    setRequisitoNuevo('');
  }

  function eliminarRequisito(competencia: string) {
    if (!vacante) return;
    actualizarVacante({
      requisitos: vacante.requisitos.filter(
        (requirement) => requirement.competencia !== competencia,
      ),
    });
  }

  async function sincronizarRequisitos(
    requisitosDeseados: RequisitoTecnicoEditable[],
  ) {
    const actuales =
      await technicalRequirementsClient.obtenerRequisitosRemotos(id);
    const actualByName = new Map(
      actuales.map((requirement) => [
        canonicalName(requirement.competencia),
        requirement,
      ]),
    );
    const desiredByName = new Map(
      requisitosDeseados.map((requirement) => [
        canonicalName(requirement.competencia),
        requirement,
      ]),
    );

    for (const requirement of actuales) {
      const key = canonicalName(requirement.competencia);
      const desired = desiredByName.get(key);
      if (!desired) {
        await technicalRequirementsClient.eliminarRequisitoRemoto(
          id,
          requirement.id,
        );
        continue;
      }

      const changes: {
        nivel?: NivelEsperado;
        tipo?: TipoRequisito;
        descripcion?: string;
      } = {};
      if (requirement.nivel !== desired.nivel) changes.nivel = desired.nivel;
      if (requirement.tipo !== desired.tipo) changes.tipo = desired.tipo;
      if ((requirement.descripcion ?? '') !== (desired.descripcion ?? '')) {
        changes.descripcion = desired.descripcion ?? '';
      }

      if (Object.keys(changes).length > 0) {
        await technicalRequirementsClient.actualizarRequisitoRemoto(
          id,
          requirement.id,
          changes,
        );
      }
    }

    const additions = requisitosDeseados
      .filter(
        (requirement) =>
          !actualByName.has(canonicalName(requirement.competencia)),
      )
      .map(({ competencia, nivel, tipo, descripcion }) => ({
        competencia: competencia.trim(),
        nivel,
        tipo,
        ...(descripcion ? { descripcion } : {}),
      }));

    if (additions.length > 0) {
      await technicalRequirementsClient.asociarRequisitosRemotos(id, additions);
    }
  }

  async function guardarCambios() {
    if (!vacante || !hayCambios || estadoPantalla === 'guardando') return;

    const error = validarVacante(vacante);
    if (error) {
      setMensajeError(error);
      setEstadoPantalla('error');
      return;
    }

    setEstadoPantalla('guardando');
    setMensajeError('');
    let datosPersistidos = false;

    try {
      const updated = await updateVacancy(id, {
        titulo: vacante.nombre.trim(),
        estado: vacante.estado,
        descripcion: vacante.descripcion.trim(),
      });
      if (updated.id !== id) {
        throw new Error(
          'El servicio devolvió un identificador diferente al de la vacante editada.',
        );
      }
      datosPersistidos = true;

      await sincronizarRequisitos(vacante.requisitos);

      const [persistedVacancy, persistedRequirements] = await Promise.all([
        getVacancy(id),
        technicalRequirementsClient.obtenerRequisitosRemotos(id),
      ]);

      if (
        persistedVacancy.id !== id ||
        persistedVacancy.titulo !== vacante.nombre.trim() ||
        persistedVacancy.estado !== vacante.estado ||
        persistedVacancy.descripcion !== vacante.descripcion.trim() ||
        !requirementsMatch(persistedRequirements, vacante.requisitos)
      ) {
        throw new Error(
          'Los datos guardados no coinciden con los cambios solicitados. No se reindexó la vacante.',
        );
      }

      const indexResult = await indexVacancy(id);
      if (!indexResult.indexed || indexResult.id !== id) {
        throw new Error(
          'El servicio de indexación no confirmó la actualización con el mismo identificador.',
        );
      }

      const saved = crearVacanteEditable(
        persistedVacancy,
        persistedRequirements,
      );
      setVacante(saved);
      setOriginal(saved);
      setEstadoPantalla('guardado');
    } catch (error) {
      const detail =
        error instanceof Error
          ? error.message
          : 'Ocurrió un error inesperado al actualizar la vacante.';
      setMensajeError(
        datosPersistidos
          ? `Los datos pueden haberse guardado parcialmente, pero no se confirmó la reindexación. Revisa el estado antes de volver a guardar. ${detail}`
          : detail,
      );
      setEstadoPantalla('error');
    }
  }

  function descartarCambios() {
    if (!original) return;
    setVacante({
      ...original,
      requisitos: original.requisitos.map((requirement) => ({ ...requirement })),
    });
    setRequisitoNuevo('');
    setEstadoPantalla('inicial');
    setMensajeError('');
  }

  if (loadedKey !== requestKey) {
    return (
      <main className="min-h-[calc(100vh-84px)] bg-[#eee9df] px-5 py-12 text-[#1b2632] sm:px-8">
        <p role="status" className="mx-auto max-w-6xl text-sm text-[#6e7880]">
          Cargando los datos guardados de la vacante...
        </p>
      </main>
    );
  }

  if (!vacante) {
    return (
      <main className="min-h-[calc(100vh-84px)] bg-[#eee9df] px-5 py-12 text-[#1b2632] sm:px-8">
        <section role="alert" className="mx-auto max-w-2xl rounded-xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold">No se pudo cargar la vacante</h1>
          <p className="mt-3 text-sm text-[#6e7880]">{mensajeError}</p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="mt-5 rounded-md bg-[#ffb162] px-5 py-2.5 text-sm font-semibold text-[#1b2632]"
          >
            Intentar nuevamente
          </button>
          <Link href="/vacantes" className="ml-3 text-sm font-semibold hover:underline">
            Volver a vacantes
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-84px)] bg-[#eee9df] text-[#1b2632]">
      <div className="mx-auto max-w-6xl px-5 py-9 sm:px-8">
        <Link
          href={`/vacantes/${encodeURIComponent(id)}`}
          className="inline-flex items-center gap-2 text-sm text-[#6e7880] hover:text-[#1b2632]"
        >
          <ArrowLeft size={16} />
          Volver al detalle de la vacante
        </Link>

        <nav aria-label="Ruta de navegación" className="mt-5 text-xs text-[#7a858d]">
          Mis vacantes / Detalles de vacante /{' '}
          <span aria-current="page" className="font-medium text-[#1b2632]">
            Editar
          </span>
        </nav>
        <h1 className="mt-3 text-2xl font-bold">Editar vacante</h1>
        <p className="mt-1 text-sm text-[#6e7880]">
          Actualiza los datos de la vacante y sincroniza la versión indexada.
        </p>

        {estadoPantalla === 'error' && (
          <div role="alert" className="mt-7 rounded-md border border-orange-300 bg-[#fff0df] px-5 py-4 text-sm text-orange-800">
            <p className="font-bold">Cambios sin confirmar</p>
            <p className="mt-1">{mensajeError}</p>
          </div>
        )}

        {estadoPantalla === 'pendiente' && (
          <div role="status" className="mt-7 rounded-md border border-orange-300 bg-[#fff0df] px-5 py-4 text-sm text-orange-800">
            <p className="font-bold">Cambios pendientes</p>
            <p className="mt-1">
              Cambios pendientes, revisa la información modificada y guarda los
              cambios.
            </p>
          </div>
        )}

        {estadoPantalla === 'guardando' && (
          <div role="status" className="mt-7 rounded-md border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-800">
            Guardando los cambios y actualizando el índice...
          </div>
        )}

        {estadoPantalla === 'guardado' && (
          <div role="status" className="mt-7 rounded-md border border-emerald-300 bg-[#e5f4eb] px-5 py-4 text-sm text-emerald-800">
            <p className="font-bold">Cambios guardados correctamente</p>
            <p className="mt-1">
              La vacante fue sincronizada con el índice y conserva su
              identificador {vacante.id}.
            </p>
          </div>
        )}

        <section className="mt-7 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-7 flex items-center justify-between">
            <h2 className="text-sm font-bold">Información editable</h2>
            <span className="rounded-full bg-slate-100 px-4 py-1 text-xs text-slate-600">
              Código: {vacante.codigo}
            </span>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <label className={estiloEtiqueta}>
              Nombre del cargo <span className="text-red-500">*</span>
              <input
                className={estiloCampo}
                maxLength={150}
                value={vacante.nombre}
                onChange={(event) =>
                  actualizarVacante({ nombre: event.target.value })
                }
              />
            </label>

            <label className={estiloEtiqueta}>
              Estado <span className="text-red-500">*</span>
              <select
                className={estiloCampo}
                value={vacante.estado}
                onChange={(event) =>
                  actualizarVacante({ estado: event.target.value })
                }
              >
                {!['Disponible', 'No disponible'].includes(vacante.estado) && (
                  <option value={vacante.estado}>{vacante.estado}</option>
                )}
                <option value="Disponible">Disponible</option>
                <option value="No disponible">No disponible</option>
              </select>
            </label>

            <label className={estiloEtiqueta}>
              Identificador de vacante
              <input
                className={`${estiloCampo} bg-stone-100`}
                value={vacante.codigo}
                readOnly
                aria-label="Código de la vacante (no editable)"
              />
            </label>
          </div>

          <label className={`${estiloEtiqueta} mt-6`}>
            Descripción breve <span className="text-red-500">*</span>
            <textarea
              rows={3}
              maxLength={DESCRIPCION_MAX_CARACTERES}
              className={estiloCampo}
              value={vacante.descripcion}
              onChange={(event) =>
                actualizarVacante({ descripcion: event.target.value })
              }
            />
            <span className="mt-1 block font-normal text-slate-400">
              Entre 20 y {DESCRIPCION_MAX_CARACTERES} caracteres (
              {vacante.descripcion.length}/{DESCRIPCION_MAX_CARACTERES}).
            </span>
          </label>

          <div className="mt-7 grid items-end gap-4 md:grid-cols-4">
            <label className={estiloEtiqueta}>
              Nuevo requisito <span className="text-red-500">*</span>
              <input
                className={estiloCampo}
                maxLength={100}
                placeholder="Ej. SQL"
                value={requisitoNuevo}
                onChange={(event) => setRequisitoNuevo(event.target.value)}
              />
            </label>

            <label className={estiloEtiqueta}>
              Nivel <span className="text-red-500">*</span>
              <select
                className={estiloCampo}
                value={nivel}
                onChange={(event) =>
                  setNivel(event.target.value as NivelEsperado)
                }
              >
                {NIVELES_ESPERADOS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </label>

            <label className={estiloEtiqueta}>
              Tipo <span className="text-red-500">*</span>
              <select
                className={estiloCampo}
                value={tipo}
                onChange={(event) =>
                  setTipo(event.target.value as TipoRequisito)
                }
              >
                {TIPOS_REQUISITO.map((requirementType) => (
                  <option key={requirementType} value={requirementType}>
                    {requirementType}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={agregarRequisito}
              disabled={estadoPantalla === 'guardando'}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#c9c2b3] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#aea594] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={16} />
              Agregar requisito
            </button>
          </div>

          <div className="mt-7 rounded-md bg-[#f5f2ec] px-4 py-4">
            <h3 className="mb-3 text-xs font-bold">Requisitos actuales</h3>
            {vacante.requisitos.length === 0 ? (
              <p className="text-xs text-red-600">
                No hay requisitos registrados.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {vacante.requisitos.map((requirement) => (
                  <li
                    key={requirement.id ?? requirement.competencia}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-[#335875] shadow-sm"
                  >
                    <span>
                      {requirement.competencia} · {requirement.nivel} ·{' '}
                      {requirement.tipo}
                    </span>
                    <button
                      type="button"
                      onClick={() => eliminarRequisito(requirement.competencia)}
                      disabled={estadoPantalla === 'guardando'}
                      aria-label={`Quitar ${requirement.competencia}`}
                      className="rounded-full p-0.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={descartarCambios}
            disabled={!hayCambios || estadoPantalla === 'guardando'}
            className="rounded-md border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-slate-400"
          >
            Descartar cambios
          </button>

          <button
            type="button"
            onClick={guardarCambios}
            disabled={!hayCambios || estadoPantalla === 'guardando'}
            className="inline-flex items-center gap-2 rounded-md bg-orange-400 px-6 py-3 text-sm font-bold text-slate-900 hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-[#c9c2b3] disabled:text-white"
          >
            {estadoPantalla === 'guardando' ? (
              'Actualizando...'
            ) : (
              'Guardar cambios'
            )}
          </button>
        </div>

        <footer className="mt-8 flex justify-between border-t border-stone-200 pt-4 text-[10px] text-slate-400">
          <span>UMSS Inspira · Gestión de oportunidades laborales</span>
          <span>Ayuda · Privacidad</span>
        </footer>
      </div>
    </main>
  );
}
