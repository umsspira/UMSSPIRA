
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  UserX,
  UserCheck,
  Send,
} from "lucide-react";

import {
  obtenerUsuariosEmpresa,
  invitarUsuarioEmpresa,
  actualizarUsuarioEmpresa,
  cancelarInvitacionEmpresa,
  reenviarInvitacionEmpresa,
  type UsuarioEmpresa,
  type RolEmpresa,
  type EstadoUsuarioEmpresa,
} from "@/shared/services/company-users";

// Formatear la fecha de vencimiento.
function formatearFecha(fecha?: string | null): string {
  if (!fecha) return "Fecha no disponible";

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/La_Paz",
  }).format(valor);
}

// Mostrar el tiempo restante real, sin mostrar "0 días".
function obtenerTextoVencimiento(fecha?: string | null): string {
  if (!fecha) return "Fecha de vencimiento no disponible";

  const vencimiento = new Date(fecha).getTime();

  if (Number.isNaN(vencimiento)) {
    return "Fecha de vencimiento no disponible";
  }

  const restante = vencimiento - Date.now();

  if (restante <= 0) {
    return "Invitación vencida";
  }

  const unDia = 24 * 60 * 60 * 1000;

  if (restante < unDia) {
    return "Vence en menos de 1 día";
  }

  const dias = Math.ceil(restante / unDia);

  return `Vence en ${dias} ${dias === 1 ? "día" : "días"}`;
}

function estaVencida(u: UsuarioEmpresa): boolean {
  if (u.estado === "Vencida") return true;

  if (u.estado !== "Pendiente" || !u.expira_en) {
    return false;
  }

  const fecha = new Date(u.expira_en).getTime();

  return Number.isFinite(fecha) && fecha <= Date.now();
}

export default function GestionUsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioEmpresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] =
    useState<"Todos" | EstadoUsuarioEmpresa>("Todos");

  const [confirmarReenvio, setConfirmarReenvio] =
    useState<UsuarioEmpresa | null>(null);

  const [mostrarInvitar, setMostrarInvitar] = useState(false);

  const [confirmarEstado, setConfirmarEstado] =
    useState<UsuarioEmpresa | null>(null);

  const [confirmarCancelar, setConfirmarCancelar] =
    useState<UsuarioEmpresa | null>(null);

  const [invitacionCreada, setInvitacionCreada] =
    useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [rol, setRol] = useState<RolEmpresa>("Reclutador");

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  // Permite actualizar la visualización cuando vence una invitación.
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const intervalo = setInterval(() => {
      setAhora(Date.now());
    }, 60_000);

    return () => clearInterval(intervalo);
  }, []);

  const nombreValido = (valor: string) => {
    const limpio = valor.trim();

    return (
      limpio.length >= 2 &&
      limpio.length <= 80 &&
      /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/.test(
        limpio
      )
    );
  };

  useEffect(() => {
    let activo = true;

    obtenerUsuariosEmpresa()
      .then((datos) => {
        if (activo) setUsuarios(datos);
      })
      .catch((e: unknown) => {
        if (activo) {
          setError(
            e instanceof Error
              ? e.message
              : "Error al cargar usuarios"
          );
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  const estadoVisible = (u: UsuarioEmpresa): EstadoUsuarioEmpresa =>
    estaVencida(u) ? "Vencida" : u.estado;

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return usuarios.filter((u) => {
      const estado = estaVencida(u) ? "Vencida" : u.estado;

      const coincideBusqueda = [
        u.nombre,
        u.correo,
        u.rol,
        estado,
      ].some((valor) =>
        valor.toLowerCase().includes(q)
      );

      const coincideEstado =
        filtroEstado === "Todos" || estado === filtroEstado;

      return coincideBusqueda && coincideEstado;
    });
    // ahora permite recalcular el estado al transcurrir el tiempo.
  }, [usuarios, busqueda, filtroEstado, ahora]);

  const limpiarMensajes = () => {
    setError("");
    setMensaje("");
  };

  async function invitar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (procesando) return;

    limpiarMensajes();

    const n = nombre.trim();
    const c = correo.trim().toLowerCase();

    if (!nombreValido(n)) {
      setError(
        "El nombre debe tener entre 2 y 80 caracteres y contener solo letras."
      );
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)) {
      setError("Ingresa un correo válido.");
      return;
    }

    if (
      usuarios.some(
        (u) => u.correo.toLowerCase() === c
      )
    ) {
      setError(
        "Este correo ya está registrado o tiene una invitación pendiente."
      );
      return;
    }

    setProcesando(true);

    try {
      const creada = await invitarUsuarioEmpresa({
        nombre: n,
        correo: c,
        rol,
      });

      setUsuarios((prev) => [
        ...prev,
        { ...creada, nombre: n },
      ]);

      setMostrarInvitar(false);
      setInvitacionCreada(c);
      setNombre("");
      setCorreo("");
      setRol("Reclutador");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo registrar la invitación."
      );
    } finally {
      setProcesando(false);
    }
  }

  async function cancelarInvitacion() {
    const seleccionado = confirmarCancelar;

    if (!seleccionado || procesando) return;

    limpiarMensajes();
    setProcesando(true);

    try {
      await cancelarInvitacionEmpresa(seleccionado.id);

      setUsuarios((prev) =>
        prev.filter((u) => u.id !== seleccionado.id)
      );

      setConfirmarCancelar(null);
      setMensaje("Invitación cancelada.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo cancelar la invitación."
      );
    } finally {
      setProcesando(false);
    }
  }

  async function reenviarInvitacion() {
    const seleccionada = confirmarReenvio;

    if (!seleccionada || procesando) return;

    limpiarMensajes();
    setProcesando(true);

    try {
      const resultado = await reenviarInvitacionEmpresa(
        seleccionada.id
      );

      const actualizados = await obtenerUsuariosEmpresa();

      setUsuarios(actualizados);
      setConfirmarReenvio(null);

      setMensaje(
        `Invitación reenviada a ${resultado.correo}`
      );
    } catch (e) {
      setConfirmarReenvio(null);

      setError(
        e instanceof Error
          ? e.message
          : "No se pudo reenviar la invitación."
      );

      try {
        const actualizados = await obtenerUsuariosEmpresa();
        setUsuarios(actualizados);
      } catch {
        // Mantener la lista si falla la actualización.
      }
    } finally {
      setProcesando(false);
    }
  }

  async function cambiarEstado() {
    const seleccionado = confirmarEstado;

    if (!seleccionado || procesando) return;

    // El titular de la empresa nunca puede desactivarse.
    if (seleccionado.esTitular) {
      setConfirmarEstado(null);
      setError(
        "No se puede modificar el estado del administrador principal."
      );
      return;
    }

    if (
      seleccionado.estado === "Pendiente" ||
      seleccionado.estado === "Vencida"
    ) {
      setConfirmarEstado(null);
      setError(
        "No se puede activar o desactivar una invitación."
      );
      return;
    }

    limpiarMensajes();

    const estado =
      seleccionado.estado === "Activo"
        ? "Inactivo"
        : "Activo";

    setProcesando(true);

    try {
      const actualizado = await actualizarUsuarioEmpresa(
        seleccionado.id,
        { estado }
      );

      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === seleccionado.id
            ? { ...u, ...actualizado }
            : u
        )
      );

      setConfirmarEstado(null);

      setMensaje(
        `Usuario ${estado === "Activo" ? "activado" : "desactivado"
        }.`
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo actualizar el estado."
      );
    } finally {
      setProcesando(false);
    }
  }

  async function cambiarRol(
    u: UsuarioEmpresa,
    nuevoRol: RolEmpresa
  ) {
    if (
      procesando ||
      u.esTitular ||
      u.estado === "Pendiente" ||
      u.estado === "Vencida"
    ) {
      return;
    }

    if (u.rol === nuevoRol) return;

    limpiarMensajes();
    setProcesando(true);

    try {
      const actualizado = await actualizarUsuarioEmpresa(
        u.id,
        { rol: nuevoRol }
      );

      setUsuarios((prev) =>
        prev.map((item) =>
          item.id === u.id
            ? { ...item, ...actualizado }
            : item
        )
      );

      setMensaje("Rol actualizado.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo actualizar el rol."
      );
    } finally {
      setProcesando(false);
    }
  }

  const cerrarInvitar = () => {
    if (!procesando) {
      setMostrarInvitar(false);
      setError("");
    }
  };

  return (
    <main className="min-h-screen bg-[#F6F3ED] px-4 py-8 text-slate-800 sm:px-8">
      <div className="mx-auto max-w-6xl">
        {/* ENCABEZADO */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-900">
              Gestión de usuarios
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Administra los usuarios de tu empresa.
              Puedes invitar nuevos colegas y desactivar accesos.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              limpiarMensajes();
              setMostrarInvitar(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600"
          >
            <Plus size={20} />
            Invitar usuario
          </button>
        </div>

        {/* MENSAJES */}
        {mensaje && (
          <div
            role="status"
            className="mb-4 flex gap-2 rounded-lg bg-green-50 p-3 text-green-700"
          >
            <CheckCircle2 size={20} />
            {mensaje}
          </div>
        )}

        {error && !mostrarInvitar && (
          <div
            role="alert"
            className="mb-4 flex gap-2 rounded-lg bg-red-50 p-3 text-red-700"
          >
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* TABLA DE USUARIOS */}
        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Users size={21} />
              Usuarios de la empresa
            </h2>

            <select
              aria-label="Filtrar por estado"
              value={filtroEstado}
              onChange={(e) =>
                setFiltroEstado(
                  e.target.value as
                  | "Todos"
                  | EstadoUsuarioEmpresa
                )
              }
              className="rounded-lg border bg-white px-3 py-2 text-sm"
            >
              <option value="Todos">Estado: Todos</option>
              <option value="Activo">Activo</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Vencida">Vencida</option>
              <option value="Inactivo">Inactivo</option>
            </select>

            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-3 text-gray-400"
              />

              <input
                type="search"
                placeholder="Buscar usuario..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="rounded-lg border py-2 pl-10 pr-3 outline-none focus:border-orange-400"
              />
            </div>
          </div>

          {/* VISTA PARA COMPUTADORA */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-gray-50 text-blue-900">
                <tr>
                  <th className="px-5 py-4">Nombre</th>
                  <th className="px-5 py-4">
                    Correo electrónico
                  </th>
                  <th className="px-5 py-4">Rol</th>
                  <th className="px-5 py-4">Estado</th>
                  <th className="px-5 py-4">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {cargando ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-10 text-center"
                    >
                      <Loader2 className="mx-auto animate-spin" />
                      Cargando usuarios...
                    </td>
                  </tr>
                ) : filtrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-10 text-center text-gray-500"
                    >
                      No se encontraron usuarios.
                    </td>
                  </tr>
                ) : (
                  filtrados.map((u) => {
                    const estado = estadoVisible(u);

                    return (
                      <tr
                        key={u.id}
                        className={`border-t ${estado === "Vencida"
                          ? "bg-orange-50 hover:bg-orange-100"
                          : "hover:bg-gray-50"
                          }`}
                      >
                        <td className="px-5 py-4 font-medium">
                          {u.nombre}
                        </td>

                        <td className="px-5 py-4 text-gray-600">
                          {u.correo}
                        </td>

                        <td className="px-5 py-4">
                          {u.esTitular ||
                            estado === "Pendiente" ||
                            estado === "Vencida" ? (
                            <span>{u.rol}</span>
                          ) : (
                            <select
                              value={u.rol}
                              disabled={procesando}
                              onChange={(e) =>
                                void cambiarRol(
                                  u,
                                  e.target.value as RolEmpresa
                                )
                              }
                              className="rounded-md border bg-white px-2 py-2 disabled:opacity-50"
                            >
                              <option value="Administrador">
                                Administrador
                              </option>
                              <option value="Reclutador">
                                Reclutador
                              </option>
                            </select>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-col items-start gap-1">
                            <span
                              className={`rounded-md px-3 py-1 text-xs font-semibold ${estado === "Activo"
                                ? "bg-green-100 text-green-700"
                                : estado === "Pendiente"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : estado === "Vencida"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                            >
                              {estado}
                            </span>

                            {estado === "Pendiente" && (
                              <span className="text-xs text-gray-500">
                                {obtenerTextoVencimiento(
                                  u.expira_en
                                )}
                              </span>
                            )}

                            {estado === "Vencida" && (
                              <span className="text-xs text-red-600">
                                Venció el{" "}
                                {formatearFecha(u.expira_en)}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {estado === "Vencida" ? (
                            <button
                              type="button"
                              disabled={procesando}
                              onClick={() => {
                                limpiarMensajes();
                                setConfirmarReenvio(u);
                              }}
                              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                            >
                              <Send size={16} />
                              Reenviar
                            </button>
                          ) : estado === "Pendiente" ? (
                            <button
                              type="button"
                              disabled={procesando}
                              onClick={() => {
                                limpiarMensajes();
                                setConfirmarCancelar(u);
                              }}
                              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              <X size={16} />
                              Cancelar invitación
                            </button>
                          ) : u.esTitular ? (
                            <span className="text-xs font-medium text-gray-400">
                              Administrador principal
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={procesando}
                              onClick={() => {
                                limpiarMensajes();
                                setConfirmarEstado(u);
                              }}
                              className={`flex items-center gap-2 rounded-md px-3 py-2 disabled:opacity-50 ${estado === "Activo"
                                ? "text-red-600 hover:bg-red-50"
                                : "text-green-700 hover:bg-green-50"
                                }`}
                            >
                              {estado === "Activo" ? (
                                <>
                                  <UserX size={16} />
                                  Desactivar
                                </>
                              ) : (
                                <>
                                  <UserCheck size={16} />
                                  Activar
                                </>
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* TARJETAS PARA CELULAR */}
          <div className="space-y-4 p-4 md:hidden">
            {cargando ? (
              <div className="flex justify-center p-6">
                <Loader2 className="animate-spin" />
              </div>
            ) : filtrados.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                No se encontraron usuarios.
              </p>
            ) : (
              filtrados.map((u) => {
                const estado = estadoVisible(u);

                return (
                  <article
                    key={u.id}
                    className={`min-w-0 overflow-hidden rounded-xl border p-4 shadow-sm ${estado === "Vencida"
                      ? "border-orange-200 bg-orange-50"
                      : "bg-white"
                      }`}
                  >
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words font-semibold text-blue-900">
                          {u.nombre}
                        </h3>

                        <p className="mt-1 break-all text-xs text-gray-600">
                          {u.correo}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${estado === "Activo"
                          ? "bg-green-100 text-green-700"
                          : estado === "Pendiente"
                            ? "bg-yellow-100 text-yellow-700"
                            : estado === "Vencida"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                      >
                        {estado}
                      </span>
                    </div>

                    <div className="mt-4 border-t pt-3">
                      <p className="text-sm text-gray-600">
                        Rol: <strong>{u.rol}</strong>
                      </p>

                      {estado === "Pendiente" && (
                        <p className="mt-2 text-xs text-yellow-700">
                          {obtenerTextoVencimiento(
                            u.expira_en
                          )}
                        </p>
                      )}

                      {estado === "Vencida" && (
                        <p className="mt-2 text-xs text-red-600">
                          Venció el{" "}
                          {formatearFecha(u.expira_en)}
                        </p>
                      )}
                    </div>

                    <div className="mt-4">
                      {estado === "Vencida" ? (
                        <button
                          type="button"
                          disabled={procesando}
                          onClick={() => {
                            limpiarMensajes();
                            setConfirmarReenvio(u);
                          }}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 font-semibold text-white disabled:opacity-50"
                        >
                          <Send size={17} />
                          Reenviar
                        </button>
                      ) : estado === "Pendiente" ? (
                        <button
                          type="button"
                          disabled={procesando}
                          onClick={() => {
                            limpiarMensajes();
                            setConfirmarCancelar(u);
                          }}
                          className="w-full rounded-lg border border-red-200 px-4 py-3 text-sm font-medium text-red-600 disabled:opacity-50"
                        >
                          Cancelar invitación
                        </button>
                      ) : u.esTitular ? (
                        <p className="text-center text-xs font-medium text-gray-400">
                          Administrador principal
                        </p>
                      ) : (
                        <div className="space-y-3">
                          <select
                            aria-label={`Rol de ${u.nombre}`}
                            value={u.rol}
                            disabled={procesando}
                            onChange={(e) =>
                              void cambiarRol(
                                u,
                                e.target.value as RolEmpresa
                              )
                            }
                            className="w-full rounded-lg border bg-white p-3 text-sm"
                          >
                            <option value="Administrador">
                              Administrador
                            </option>
                            <option value="Reclutador">
                              Reclutador
                            </option>
                          </select>

                          <button
                            type="button"
                            disabled={procesando}
                            onClick={() => {
                              limpiarMensajes();
                              setConfirmarEstado(u);
                            }}
                            className={`w-full rounded-lg border px-4 py-3 text-sm font-semibold disabled:opacity-50 ${estado === "Activo"
                              ? "border-red-200 text-red-600"
                              : "border-green-200 text-green-700"
                              }`}
                          >
                            {estado === "Activo"
                              ? "Desactivar"
                              : "Activar"}
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <div className="border-t px-5 py-4 text-sm text-gray-500">
            Total de usuarios: {filtrados.length}
          </div>
        </section>
      </div>

      {/* MODAL INVITAR */}
      {mostrarInvitar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-invitar"
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2
                id="titulo-invitar"
                className="text-xl font-bold"
              >
                Invitar usuario
              </h2>

              <button
                type="button"
                disabled={procesando}
                onClick={cerrarInvitar}
                aria-label="Cerrar"
              >
                <X size={22} />
              </button>
            </div>

            <form
              onSubmit={(e) => void invitar(e)}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="hu3-nombre"
                  className="mb-2 block text-sm font-medium"
                >
                  Nombre completo
                </label>

                <input
                  id="hu3-nombre"
                  type="text"
                  required
                  minLength={2}
                  maxLength={80}
                  value={nombre}
                  onChange={(e) => {
                    const valor = e.target.value
                      .replace(
                        /[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]/g,
                        ""
                      )
                      .slice(0, 80);

                    setNombre(valor);
                  }}
                  placeholder="Nombre del colaborador"
                  className="w-full rounded-lg border p-3 outline-none focus:border-orange-400"
                />

                <p className="mt-1 text-right text-xs text-gray-500">
                  {nombre.length}/80 caracteres
                </p>
              </div>

              <div>
                <label
                  htmlFor="hu3-correo"
                  className="mb-2 block text-sm font-medium"
                >
                  Correo electrónico
                </label>

                <input
                  id="hu3-correo"
                  required
                  type="email"
                  value={correo}
                  onChange={(e) =>
                    setCorreo(e.target.value)
                  }
                  placeholder="usuario@empresa.com"
                  className="w-full rounded-lg border p-3 outline-none focus:border-orange-400"
                />
              </div>

              <div>
                <label
                  htmlFor="hu3-rol"
                  className="mb-2 block text-sm font-medium"
                >
                  Rol
                </label>

                <select
                  id="hu3-rol"
                  value={rol}
                  onChange={(e) =>
                    setRol(e.target.value as RolEmpresa)
                  }
                  className="w-full rounded-lg border p-3"
                >
                  <option value="Administrador">
                    Administrador
                  </option>
                  <option value="Reclutador">
                    Reclutador
                  </option>
                </select>
              </div>

              {error && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0"
                  />
                  <span className="break-words">
                    {error}
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  disabled={procesando}
                  onClick={cerrarInvitar}
                  className="rounded-lg border px-5 py-3"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={procesando}
                  className="rounded-lg bg-orange-400 px-5 py-3 font-semibold disabled:opacity-50"
                >
                  {procesando
                    ? "Registrando..."
                    : "Invitar usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE INVITACIÓN REGISTRADA */}
      {invitacionCreada && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-exito"
            className="w-full max-w-sm rounded-xl bg-white p-7 text-center shadow-xl"
          >
            <CheckCircle2
              className="mx-auto mb-4 text-green-600"
              size={56}
            />

            <h2
              id="titulo-exito"
              className="text-xl font-bold text-blue-900"
            >
              Invitación registrada
            </h2>

            <p className="mt-3 text-sm">
              Se registró la invitación para{" "}
              <strong>{invitacionCreada}</strong>.
            </p>

            <p className="mt-2 text-sm text-gray-500">
              El correo de activación quedó pendiente de envío.
            </p>

            <button
              type="button"
              onClick={() =>
                setInvitacionCreada(null)
              }
              className="mt-6 w-full rounded-lg bg-orange-500 p-3 font-semibold text-white"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      {/* MODAL REENVIAR INVITACIÓN */}
      {confirmarReenvio && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-reenvio"
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-full bg-orange-100 p-3 text-orange-500">
                <Send size={22} />
              </div>

              <h2
                id="titulo-reenvio"
                className="text-xl font-bold text-blue-900"
              >
                ¿Reenviar invitación?
              </h2>
            </div>

            <p className="mb-3 text-sm text-gray-700">
              Enviaremos un nuevo enlace a{" "}
              <strong className="break-all">
                {confirmarReenvio.correo}
              </strong>
              , válido por 7 días.
            </p>

            <p className="mb-6 text-sm text-gray-500">
              El enlace anterior dejará de funcionar.
            </p>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={procesando}
                onClick={() =>
                  setConfirmarReenvio(null)
                }
                className="rounded-lg border px-5 py-3 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={procesando}
                onClick={() =>
                  void reenviarInvitacion()
                }
                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {procesando ? (
                  <>
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                    Reenviando...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Reenviar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CANCELAR INVITACIÓN */}
      {confirmarCancelar && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-cancelar"
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                disabled={procesando}
                onClick={() =>
                  setConfirmarCancelar(null)
                }
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <AlertCircle
              className="mx-auto mb-4 text-red-500"
              size={50}
            />

            <h2
              id="titulo-cancelar"
              className="text-center text-xl font-bold text-blue-900"
            >
              Cancelar invitación
            </h2>

            <p className="mt-4 text-center text-sm">
              ¿Deseas cancelar la invitación de{" "}
              <strong>
                {confirmarCancelar.nombre}
              </strong>
              ?
            </p>

            <p className="mt-3 text-center text-sm text-gray-500">
              {confirmarCancelar.correo}
            </p>

            <p className="my-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              El enlace dejará de ser válido.
              Esta acción no afecta a usuarios activos.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={procesando}
                onClick={() =>
                  setConfirmarCancelar(null)
                }
                className="rounded-lg border px-5 py-3"
              >
                Volver
              </button>

              <button
                type="button"
                disabled={procesando}
                onClick={() =>
                  void cancelarInvitacion()
                }
                className="rounded-lg bg-red-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
              >
                {procesando
                  ? "Cancelando..."
                  : "Cancelar invitación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ACTIVAR / DESACTIVAR */}
      {confirmarEstado && !confirmarEstado.esTitular && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-estado"
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
          >
            <AlertCircle
              className="mx-auto mb-4 text-red-500"
              size={50}
            />

            <h2
              id="titulo-estado"
              className="text-center text-xl font-bold text-blue-900"
            >
              {confirmarEstado.estado === "Activo"
                ? "Desactivar usuario"
                : "Activar usuario"}
            </h2>

            <p className="my-5 text-center text-sm">
              ¿Deseas{" "}
              {confirmarEstado.estado === "Activo"
                ? "desactivar"
                : "activar"}{" "}
              a{" "}
              <strong>
                {confirmarEstado.nombre}
              </strong>
              ?
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={procesando}
                onClick={() =>
                  setConfirmarEstado(null)
                }
                className="rounded-lg border px-5 py-3"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={procesando}
                onClick={() =>
                  void cambiarEstado()
                }
                className={`rounded-lg px-5 py-3 font-semibold text-white disabled:opacity-50 ${confirmarEstado.estado === "Activo"
                  ? "bg-red-600"
                  : "bg-green-600"
                  }`}
              >
                {procesando
                  ? "Procesando..."
                  : confirmarEstado.estado === "Activo"
                    ? "Desactivar"
                    : "Activar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
