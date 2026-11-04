"use client";

import { useEffect, useState } from "react";
import {
  crearVacanteEjemplo,
  guardarDemostracion,
  leerDemostracion,
  requisitoDuplicado,
  validarVacante,
  type EstadoEdicion,
  type RequisitoTecnico,
  type VacanteEditable,
} from "./vacante-edicion";

type Props = {
  id: string;
};

const estiloCampo =
  "mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400";

const estiloEtiqueta =
  "block text-xs font-semibold text-slate-700";

export default function EditarVacanteForm({ id }: Props) {
  const [vacante, setVacante] = useState<VacanteEditable>(() =>
    crearVacanteEjemplo(id)
  );

  const [original, setOriginal] = useState<VacanteEditable>(() =>
    crearVacanteEjemplo(id)
  );

  const [requisitoNuevo, setRequisitoNuevo] = useState("");
  const [nivel, setNivel] =
    useState<RequisitoTecnico["nivel"]>("Avanzado");
  const [tipo, setTipo] =
    useState<RequisitoTecnico["tipo"]>("Obligatorio");

  const [estadoPantalla, setEstadoPantalla] =
    useState<EstadoEdicion>("inicial");
  const [mensajeError, setMensajeError] = useState("");

  // Recupera únicamente los cambios guardados por esta demostración.
  useEffect(() => {
    const guardada = leerDemostracion(id);
    const inicial = guardada ?? crearVacanteEjemplo(id);

    setVacante(inicial);
    setOriginal(inicial);
    setEstadoPantalla("inicial");
    setMensajeError("");
    setRequisitoNuevo("");
  }, [id]);

  const hayCambios =
    JSON.stringify(vacante) !== JSON.stringify(original);

  function actualizarVacante(
    cambios: Partial<VacanteEditable>
  ) {
    setVacante((actual) => ({
      ...actual,
      ...cambios,
    }));

    setEstadoPantalla("pendiente");
    setMensajeError("");
  }

  function agregarRequisito() {
    const nombre = requisitoNuevo.trim();

    if (nombre.length < 2) {
      setMensajeError(
        "Ingresa un requisito técnico válido."
      );
      setEstadoPantalla("error");
      return;
    }

    if (requisitoDuplicado(vacante.requisitos, nombre)) {
      setMensajeError(
        "Este requisito ya está asociado a la vacante."
      );
      setEstadoPantalla("error");
      return;
    }

    actualizarVacante({
      requisitos: [
        ...vacante.requisitos,
        { nombre, nivel, tipo },
      ],
    });

    setRequisitoNuevo("");
  }

  function eliminarRequisito(nombre: string) {
    actualizarVacante({
      requisitos: vacante.requisitos.filter(
        (r) => r.nombre !== nombre
      ),
    });
  }

  function guardarCambios() {
    const error = validarVacante(vacante);

    if (error) {
      setMensajeError(error);
      setEstadoPantalla("error");
      return;
    }

    if (!hayCambios) return;

    try {
      guardarDemostracion(vacante);
      setOriginal({
        ...vacante,
        requisitos: [...vacante.requisitos],
      });
      setEstadoPantalla("guardado");
      setMensajeError("");
    } catch {
      setMensajeError(
        "No fue posible guardar los cambios en este navegador."
      );
      setEstadoPantalla("error");
    }
  }

  function descartarCambios() {
    setVacante({
      ...original,
      requisitos: [...original.requisitos],
    });
    setRequisitoNuevo("");
    setEstadoPantalla("inicial");
    setMensajeError("");
  }

  return (
    <main className="min-h-screen bg-[#f3efe7] text-slate-800">
      <div className="mx-auto max-w-6xl px-5 py-9">
        <p className="text-xs text-slate-500">
          Mis vacantes / Detalles de vacante / Editar
        </p>

        <h1 className="mt-3 text-2xl font-bold">
          Editar vacante
        </h1>

        <p className="mt-1 text-xs text-slate-500">
          Actualiza los datos de la oportunidad y guarda los cambios.
        </p>

        {/* MOCKUP 2: ERROR DE VALIDACIÓN */}
        {estadoPantalla === "error" && (
          <div
            role="alert"
            className="mt-7 rounded-md border border-orange-300 bg-[#fff0df] px-5 py-4 text-xs text-orange-800"
          >
            <p className="font-bold">! Cambios sin guardar</p>
            <p className="mt-1">{mensajeError}</p>
          </div>
        )}

        {/* MOCKUP 3: CAMBIOS PENDIENTES */}
        {estadoPantalla === "pendiente" && (
          <div
            role="status"
            className="mt-7 rounded-md border border-orange-300 bg-[#fff0df] px-5 py-4 text-xs text-orange-800"
          >
            <p className="font-bold">! Cambios pendientes</p>
            <p className="mt-1">
              Hay cambios sin guardar. Confirma y guarda los cambios.
            </p>
          </div>
        )}

        {/* MOCKUP 4: CAMBIOS GUARDADOS */}
        {estadoPantalla === "guardado" && (
          <div
            role="status"
            className="mt-7 rounded-md border border-emerald-300 bg-[#e5f4eb] px-5 py-4 text-xs text-emerald-800"
          >
            <p className="font-bold">
              ✓ Cambios guardados correctamente
            </p>
            <p className="mt-1">
              Los cambios se guardaron en la demostración local.
              Todavía no se enviaron a Elasticsearch.
            </p>
          </div>
        )}

        {/* FORMULARIO PRINCIPAL */}
        <section className="mt-7 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-7 flex items-center justify-between">
            <h2 className="text-sm font-bold">
              Información editable
            </h2>

            <span className="rounded-full bg-slate-100 px-4 py-1 text-xs text-slate-600">
              Editando
            </span>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <label className={estiloEtiqueta}>
              Nombre del cargo <span className="text-red-500">*</span>
              <input
                className={estiloCampo}
                value={vacante.nombre}
                onChange={(e) =>
                  actualizarVacante({ nombre: e.target.value })
                }
              />
            </label>

            <label className={estiloEtiqueta}>
              Estado <span className="text-red-500">*</span>
              <select
                className={estiloCampo}
                value={vacante.estado}
                onChange={(e) =>
                  actualizarVacante({
                    estado: e.target.value as VacanteEditable["estado"],
                  })
                }
              >
                <option value="Disponible">Disponible</option>
                <option value="No disponible">No disponible</option>
              </select>
            </label>

            <label className={estiloEtiqueta}>
              Código
              <input
                className={`${estiloCampo} bg-stone-100`}
                value={vacante.codigo}
                readOnly
              />
            </label>
          </div>

          <label className={`${estiloEtiqueta} mt-6`}>
            Descripción breve <span className="text-red-500">*</span>
            <textarea
              rows={2}
              maxLength={300}
              className={estiloCampo}
              value={vacante.descripcion}
              onChange={(e) =>
                actualizarVacante({
                  descripcion: e.target.value,
                })
              }
            />
            <span className="mt-1 block font-normal text-slate-400">
              Máximo 300 caracteres.
            </span>
          </label>

          <div className="mt-7 grid items-end gap-4 md:grid-cols-4">
            <label className={estiloEtiqueta}>
              Nuevo requisito <span className="text-red-500">*</span>
              <input
                className={`${estiloCampo} ${
                  estadoPantalla === "error"
                    ? "border-red-500"
                    : ""
                }`}
                placeholder="Ej. SQL"
                value={requisitoNuevo}
                onChange={(e) => setRequisitoNuevo(e.target.value)}
                aria-invalid={estadoPantalla === "error"}
              />
            </label>

            <label className={estiloEtiqueta}>
              Nivel <span className="text-red-500">*</span>
              <select
                className={estiloCampo}
                value={nivel}
                onChange={(e) =>
                  setNivel(e.target.value as RequisitoTecnico["nivel"])
                }
              >
                <option>Básico</option>
                <option>Intermedio</option>
                <option>Avanzado</option>
              </select>
            </label>

            <label className={estiloEtiqueta}>
              Tipo <span className="text-red-500">*</span>
              <select
                className={estiloCampo}
                value={tipo}
                onChange={(e) =>
                  setTipo(e.target.value as RequisitoTecnico["tipo"])
                }
              >
                <option>Obligatorio</option>
                <option>Deseable</option>
              </select>
            </label>

            <button
              type="button"
              onClick={agregarRequisito}
              className="rounded-md bg-[#c9c2b3] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#aea594]"
            >
              Agregar
            </button>
          </div>

          {estadoPantalla === "error" && (
            <p className="mt-2 text-xs text-red-600">
              {mensajeError}
            </p>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-3 rounded-md bg-[#f5f2ec] px-4 py-4">
            <span className="mr-3 text-xs font-bold">
              Requisitos actuales
            </span>

            {vacante.requisitos.length === 0 && (
              <span className="text-xs text-red-600">
                No hay requisitos registrados.
              </span>
            )}

            {vacante.requisitos.map((requisito) => (
              <button
                type="button"
                key={requisito.nombre.toLowerCase()}
                onClick={() =>
                  eliminarRequisito(requisito.nombre)
                }
                title={`Quitar ${requisito.nombre}`}
                className={`rounded-full px-4 py-1.5 text-xs font-medium ${
                  requisito.tipo === "Deseable"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-[#e5edf5] text-[#335875]"
                }`}
              >
                {requisito.nombre} ×
              </button>
            ))}
          </div>
        </section>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={descartarCambios}
            disabled={!hayCambios}
            className="rounded-md border border-stone-300 bg-white px-5 py-3 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-slate-400"
          >
            Descartar cambios
          </button>

          <button
            type="button"
            onClick={guardarCambios}
            disabled={!hayCambios}
            className="rounded-md bg-orange-400 px-6 py-3 text-xs font-bold text-slate-900 hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-[#c9c2b3] disabled:text-white"
          >
            Guardar cambios
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