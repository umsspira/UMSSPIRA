'use client';

import { useEffect, useState } from 'react';
import { FolderGit2 } from 'lucide-react';

import { MensajeError, claseCampo } from '@/modules/profile/validation/mensaje-error';
import {
  LARGO_MAXIMO_DESCRIPCION_PROYECTO,
  LARGO_MAXIMO_NOMBRE_PROYECTO,
  validarEnlaceProyecto,
} from '@/modules/profile/validation/reglas-proyecto';
import type { ProjectRecord } from '@/modules/profile/types/profile-record';
import { ApiError } from '@/shared/services/api-client';

export type Proyecto = {
  nombre: string;
  enlace: string;
  descripcion?: string;
};

type FormularioProyectosProps = {
  proyectos: ProjectRecord[];
  // Si la promesa falla con ApiError se muestra su mensaje y el formulario se conserva
  onAgregar: (proyecto: Proyecto) => void | Promise<void>;
  // Avisa cuántos errores hay a la vista, para el contador del encabezado de la sección
  onErroresChange?: (errores: number) => void;
};

type Datos = { nombre: string; enlace: string; descripcion: string };

const VACIO: Datos = { nombre: '', enlace: '', descripcion: '' };

const CLASE_CAMPO =
  'h-11 w-full min-w-0 rounded-lg border border-[#C9C1B1] bg-[#EEE9DF] px-3 text-sm text-[#1B2632] outline-none placeholder:text-[#2C3B4D]/40 focus:border-2 focus:border-[#2C3B4D] focus:bg-white';

// Sección "Proyectos y portafolio" de Completar perfil (HU-19, T19.3): nombre, enlace y descripción corta
export function FormularioProyectos({ proyectos, onAgregar, onErroresChange }: FormularioProyectosProps) {
  const [datos, setDatos] = useState<Datos>(VACIO);
  // Error del enlace; una vez mostrado se recalcula mientras se corrige
  const [errorEnlace, setErrorEnlace] = useState<string>();
  const [errorGuardar, setErrorGuardar] = useState<string>();
  const [guardando, setGuardando] = useState(false);

  const cantidadErrores = [errorEnlace, errorGuardar].filter(Boolean).length;
  useEffect(() => onErroresChange?.(cantidadErrores), [cantidadErrores, onErroresChange]);

  const completo = datos.nombre.trim() !== '' && datos.enlace.trim() !== '';
  // Del más reciente al más antiguo
  const ordenados = [...proyectos].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  function cambiar(campo: keyof Datos, valor: string) {
    const nuevos = { ...datos, [campo]: valor };
    setDatos(nuevos);
    setErrorGuardar(undefined);
    if (campo === 'enlace' && errorEnlace) setErrorEnlace(validarEnlaceProyecto(valor));
  }

  async function agregar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!completo || guardando) return;
    // Un enlace que no es https válido no se guarda
    const error = validarEnlaceProyecto(datos.enlace);
    setErrorEnlace(error);
    if (error) return;
    setGuardando(true);
    try {
      const descripcion = datos.descripcion.trim();
      await onAgregar({
        nombre: datos.nombre.trim(),
        enlace: datos.enlace.trim(),
        ...(descripcion ? { descripcion } : {}),
      });
      setDatos(VACIO);
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      setErrorGuardar(error.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {ordenados.length > 0 && (
        <ul className="flex flex-col gap-2">
          {ordenados.map((proyecto) => (
            <li
              key={proyecto.id}
              className="flex min-w-0 items-start gap-3 rounded-xl border border-[#C9C1B1]/70 bg-[#FAF8F4] px-4 py-3"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EEE9DF]">
                <FolderGit2 className="h-4 w-4 text-[#2C3B4D]" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[#1B2632]">{proyecto.name}</span>
                <a
                  href={proyecto.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block break-all text-xs text-truffle-trouble underline"
                >
                  {proyecto.url}
                </a>
                {proyecto.description && (
                  <span className="mt-1 block text-xs text-[#2C3B4D]/70">{proyecto.description}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={agregar} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-[#1B2632]">
              Nombre del proyecto<span className="text-[#A35139]"> *</span>
            </span>
            <input
              type="text"
              value={datos.nombre}
              onChange={(evento) => cambiar('nombre', evento.target.value)}
              maxLength={LARGO_MAXIMO_NOMBRE_PROYECTO}
              placeholder="Ej. Sistema de inventario"
              className={CLASE_CAMPO}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-[#1B2632]">
              Enlace<span className="text-[#A35139]"> *</span>
            </span>
            <input
              type="url"
              inputMode="url"
              value={datos.enlace}
              onChange={(evento) => cambiar('enlace', evento.target.value)}
              placeholder="https://"
              aria-invalid={Boolean(errorEnlace)}
              aria-describedby="error-enlace-proyecto"
              className={claseCampo(CLASE_CAMPO, errorEnlace)}
            />
            <MensajeError id="error-enlace-proyecto" mensaje={errorEnlace} />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-[#1B2632]">Descripción corta (opcional)</span>
          <textarea
            value={datos.descripcion}
            onChange={(evento) => cambiar('descripcion', evento.target.value)}
            maxLength={LARGO_MAXIMO_DESCRIPCION_PROYECTO}
            rows={3}
            placeholder="Ej. Aplicación web para el control de stock"
            className="min-h-[88px] resize-y rounded-lg border border-[#C9C1B1] bg-[#EEE9DF] px-3 py-2.5 text-sm leading-[1.6] text-[#1B2632] outline-none placeholder:text-[#2C3B4D]/40 focus:border-2 focus:border-[#2C3B4D] focus:bg-white"
          />
        </label>

        <MensajeError id="error-proyecto-guardar" mensaje={errorGuardar} />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!completo || guardando}
            className="h-11 w-full rounded-lg bg-[#FFB162] px-6 text-sm font-semibold text-[#1B2632] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
          >
            {guardando ? 'Guardando…' : 'Agregar proyecto'}
          </button>
        </div>
      </form>
    </div>
  );
}
