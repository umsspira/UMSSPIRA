'use client';

import { useEffect, useState } from 'react';
import { FolderGit2, Plus } from 'lucide-react';
import { MensajeError, claseCampo } from '@/modules/profile/validation/mensaje-error';
import {
  LARGO_MAXIMO_DESCRIPCION_PROYECTO,
  LARGO_MAXIMO_ENLACE_PROYECTO,
  LARGO_MAXIMO_NOMBRE_PROYECTO,
  LARGO_MAXIMO_TECNOLOGIAS_PROYECTO,
  validarEnlaceProyecto,
} from '@/modules/profile/validation/reglas-perfil';
import { ApiError } from '@/shared/services/api-client';

// Datos del formulario «Proyectos y portafolio» (HU-19, T19.1)
export type Proyecto = {
  nombre: string;
  enlace: string;
  descripcion: string;
  // Opcional
  tecnologias: string;
};

type FormularioProyectosProps = {
  proyectos: Proyecto[];
  // Si la promesa falla con ApiError (400...), se muestra su mensaje y no se limpia el formulario
  onAgregar: (proyecto: Proyecto) => void | Promise<void>;
  // Avisa cuántos errores hay a la vista, para el contador del encabezado de la sección
  onErroresChange?: (errores: number) => void;
  // Texto del botón de enviar; en Agregar registros es «Guardar en borrador» (HU-13)
  textoBoton?: string;
  // false: no lista los proyectos registrados, como en Agregar registros (HU-13)
  mostrarRegistrados?: boolean;
  // Datos con los que arranca el formulario, por ejemplo al editar un borrador o un proyecto
  valoresIniciales?: Proyecto;
  // Avisa lo que hay escrito en cada cambio, para subirlo como borrador incompleto (HU-14)
  onDatosChange?: (datos: Proyecto) => void;
  // «Cancelar»: limpia el formulario y avisa para cerrar la sección (HU-21)
  onCancelar?: () => void;
};

export const PROYECTO_VACIO: Proyecto = { nombre: '', enlace: '', descripcion: '', tecnologias: '' };

const subtituloClase = 'text-xs font-bold uppercase tracking-wide text-[#2C3B4D]';
const labelClase = 'block text-xs font-semibold text-[#2C3B4D]';
const labelObligatorioClase = `${labelClase} after:ml-1 after:text-[#A35139] after:content-['*']`;
const inputClase =
  'mt-1.5 h-11 w-full rounded-md border border-[#C9C1B1] bg-white px-3 text-sm text-[#2C3B4D] placeholder:text-[#2C3B4D]/40 focus:border-[#FFB162] focus:outline-none';
const textareaClase =
  'mt-1.5 min-h-24 w-full rounded-md border border-[#C9C1B1] bg-white px-3 py-2 text-sm text-[#2C3B4D] placeholder:text-[#2C3B4D]/40 focus:border-[#FFB162] focus:outline-none';

export function FormularioProyectos({
  proyectos,
  onAgregar,
  onErroresChange,
  textoBoton = 'Agregar proyecto',
  mostrarRegistrados = true,
  valoresIniciales,
  onDatosChange,
  onCancelar,
}: FormularioProyectosProps) {
  const [datos, setDatos] = useState<Proyecto>(valoresIniciales ?? PROYECTO_VACIO);
  useEffect(() => onDatosChange?.(datos), [datos, onDatosChange]);
  // Error del enlace; una vez mostrado se recalcula mientras se corrige
  const [errorEnlace, setErrorEnlace] = useState<string>();
  const [errorGuardar, setErrorGuardar] = useState<string>();
  const [guardando, setGuardando] = useState(false);

  const cantidadErrores = [errorEnlace, errorGuardar].filter(Boolean).length;
  useEffect(() => onErroresChange?.(cantidadErrores), [cantidadErrores, onErroresChange]);

  function cambiar(campo: keyof Proyecto, valor: string) {
    setDatos({ ...datos, [campo]: valor });
    setErrorGuardar(undefined);
    if (campo === 'enlace' && errorEnlace) setErrorEnlace(validarEnlaceProyecto(valor));
  }

  function cancelar() {
    setDatos(PROYECTO_VACIO);
    setErrorEnlace(undefined);
    setErrorGuardar(undefined);
    onCancelar?.();
  }

  async function agregar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (guardando) return;
    const error = validarEnlaceProyecto(datos.enlace);
    setErrorEnlace(error);
    if (error) return;
    setGuardando(true);
    try {
      await onAgregar({
        nombre: datos.nombre.trim(),
        enlace: datos.enlace.trim(),
        descripcion: datos.descripcion.trim(),
        tecnologias: datos.tecnologias.trim(),
      });
      setDatos(PROYECTO_VACIO);
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      setErrorGuardar(error.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      {mostrarRegistrados && proyectos.length > 0 && (
        <div className="mb-5 border-b border-[#C9C1B1]/70 pb-5">
          <p className={subtituloClase}>Proyectos registrados</p>
          <ul className="mt-3 space-y-2">
            {proyectos.map((proyecto, indice) => (
              <li
                key={`${proyecto.enlace}-${indice}`}
                className="flex items-center gap-3 rounded-lg border border-[#C9C1B1]/70 bg-[#EEE9DF] px-3 py-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#1B2632]">
                  <FolderGit2 className="h-4 w-4 text-[#FFB162]" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[#2C3B4D]">{proyecto.nombre}</span>
                  <span className="block truncate text-xs text-[#2C3B4D]/70">{proyecto.enlace}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className={subtituloClase}>Agregar nuevo proyecto</p>

      <form onSubmit={agregar} noValidate={false} className="mt-4 space-y-4">
        <div>
          <label htmlFor="proyecto-nombre" className={labelObligatorioClase}>Nombre del proyecto</label>
          <input
            id="proyecto-nombre"
            type="text"
            required
            maxLength={LARGO_MAXIMO_NOMBRE_PROYECTO}
            placeholder="Ej. Portafolio personal"
            value={datos.nombre}
            onChange={(e) => cambiar('nombre', e.target.value)}
            className={inputClase}
          />
        </div>

        <div>
          <label htmlFor="proyecto-enlace" className={labelObligatorioClase}>Enlace del proyecto</label>
          <input
            id="proyecto-enlace"
            type="text"
            inputMode="url"
            required
            maxLength={LARGO_MAXIMO_ENLACE_PROYECTO}
            placeholder="https://"
            value={datos.enlace}
            onChange={(e) => cambiar('enlace', e.target.value)}
            aria-invalid={Boolean(errorEnlace)}
            aria-describedby="error-proyecto-enlace"
            className={claseCampo(inputClase, errorEnlace)}
          />
          <MensajeError id="error-proyecto-enlace" mensaje={errorEnlace} />
        </div>

        <div>
          <label htmlFor="proyecto-descripcion" className={labelObligatorioClase}>Descripción corta</label>
          <textarea
            id="proyecto-descripcion"
            required
            maxLength={LARGO_MAXIMO_DESCRIPCION_PROYECTO}
            placeholder="Qué hace el proyecto y cuál fue tu aporte"
            value={datos.descripcion}
            onChange={(e) => cambiar('descripcion', e.target.value)}
            className={textareaClase}
          />
        </div>

        <div>
          <label htmlFor="proyecto-tecnologias" className={labelClase}>Tecnologías (opcional)</label>
          <input
            id="proyecto-tecnologias"
            type="text"
            maxLength={LARGO_MAXIMO_TECNOLOGIAS_PROYECTO}
            placeholder="Ej. React, NestJS, PostgreSQL"
            value={datos.tecnologias}
            onChange={(e) => cambiar('tecnologias', e.target.value)}
            className={inputClase}
          />
        </div>

        <MensajeError id="error-proyecto-guardar" mensaje={errorGuardar} />

        <div className="flex flex-col gap-2 md:flex-row">
          <button
            type="submit"
            disabled={guardando}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#2C3B4D] bg-white px-4 text-sm font-medium text-[#2C3B4D] hover:bg-[#EEE9DF] disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {guardando ? 'Guardando…' : textoBoton}
          </button>
          {onCancelar && (
            <button
              type="button"
              onClick={cancelar}
              disabled={guardando}
              className="inline-flex h-10 w-full items-center justify-center rounded-md px-4 text-sm font-medium text-[#2C3B4D] hover:bg-[#EEE9DF] disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
