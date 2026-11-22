'use client';

import { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '@/shared/config/api';
import { leerBanderasMock } from '@/shared/config/mock-flags';
import { ensureAccessToken } from '@/shared/services/auth-session';

/**
 * Épica 5 · HU-19: checklist pre-demo.
 * Cada fila sale de una comprobación real: la API (GET /api/v1/demo/checklist), su
 * endpoint de salud y las banderas NEXT_PUBLIC_* con las que se compiló esta página.
 */
type Estado = 'listo' | 'revisar' | 'pendiente' | 'comprobando';
type IdChequeo = 'migraciones' | 'vacantes' | 'login-por-rol' | 'afinidad-postulacion';
interface Chequeo { id: IdChequeo; estado: Exclude<Estado, 'comprobando'>; detalle: string }
interface Fila { id: string; titulo: string; descripcion: string; estado: Estado; detalle?: string }

const FILAS: Array<{ id: string; clave: IdChequeo | 'banderas'; titulo: string; descripcion: string }> = [
  { id: 'migraciones', clave: 'migraciones', titulo: 'Migraciones aplicadas en producción', descripcion: '20261104000000 y 20261116190000' },
  { id: 'vacantes', clave: 'vacantes', titulo: 'Listado de vacantes responde 200', descripcion: '/job-postings en Render y Vercel' },
  { id: 'banderas', clave: 'banderas', titulo: 'Banderas de mock en false', descripcion: 'NEXT_PUBLIC_USE_MOCK por pantalla' },
  { id: 'login', clave: 'login-por-rol', titulo: 'Login por rol', descripcion: 'Egresado, reclutador y administrador' },
  { id: 'afinidad', clave: 'afinidad-postulacion', titulo: 'Afinidad visible y postulación funcional', descripcion: 'Con y sin porcentaje calculado' },
];

const ETIQUETA: Record<Estado, string> = { listo: 'Listo', revisar: 'Revisar', pendiente: 'Pendiente', comprobando: 'Comprobando…' };
const CLASE: Record<Estado, string> = {
  listo: 'bg-green-100 text-green-800',
  revisar: 'bg-amber-100 text-amber-800',
  pendiente: 'bg-red-100 text-red-800',
  comprobando: 'bg-gray-100 text-gray-600',
};

function estadoBanderas(): { estado: Estado; detalle: string } {
  const activas = leerBanderasMock().filter((b) => b.activa);
  if (activas.length === 0) return { estado: 'listo', detalle: 'Todas las banderas están en false.' };
  const detalle = activas.map((b) => `${b.nombre} (${b.pantallas.join(', ')})`).join('; ');
  return { estado: 'revisar', detalle: `Activas en este build: ${detalle}` };
}

async function apiResponde(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

async function cargarChequeos(): Promise<{ chequeos: Chequeo[]; apiOk: boolean } | { error: string }> {
  const apiOk = await apiResponde();
  try {
    const token = await ensureAccessToken();
    const res = await fetch(`${API_BASE_URL}/api/v1/demo/checklist`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (res.status === 403) return { error: 'Tu rol no puede ver este checklist (solo empresa y administrador).' };
    if (!res.ok) return { error: `La API respondió ${res.status}. ¿Está desplegada la versión con /demo/checklist?` };
    const body = (await res.json()) as { data?: { chequeos?: Chequeo[] } };
    return { chequeos: body.data?.chequeos ?? [], apiOk };
  } catch {
    return { error: 'No se pudo contactar con la API.' };
  }
}

export default function ChecklistPreDemoPage() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const verificar = useCallback(async () => {
    setCargando(true);
    setError(null);
    const resultado = await cargarChequeos();
    const banderas = estadoBanderas();
    if ('error' in resultado) {
      setError(resultado.error);
      setFilas(
        FILAS.map((f) =>
          f.clave === 'banderas'
            ? { id: f.id, titulo: f.titulo, descripcion: f.descripcion, ...banderas }
            : { id: f.id, titulo: f.titulo, descripcion: f.descripcion, estado: 'pendiente', detalle: 'Sin comprobar: ' + resultado.error },
        ),
      );
    } else {
      setFilas(
        FILAS.map((f) => {
          const base = { id: f.id, titulo: f.titulo, descripcion: f.descripcion };
          if (f.clave === 'banderas') return { ...base, ...banderas };
          const chequeo = resultado.chequeos.find((c) => c.id === f.clave);
          if (!chequeo) return { ...base, estado: 'pendiente' as const, detalle: 'La API no devolvió este chequeo.' };
          if (f.clave === 'vacantes' && !resultado.apiOk) {
            return { ...base, estado: 'pendiente' as const, detalle: 'El endpoint /health de la API no responde.' };
          }
          return { ...base, estado: chequeo.estado, detalle: chequeo.detalle };
        }),
      );
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    void verificar();
  }, [verificar]);

  const lista: Fila[] = filas.length
    ? filas
    : FILAS.map((f) => ({ id: f.id, titulo: f.titulo, descripcion: f.descripcion, estado: 'comprobando' as const }));
  const pendientes = lista.filter((f) => f.estado !== 'listo').length;

  return (
    <main className="min-h-screen bg-palladian p-4 text-abyssal-blue md:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-oatmeal bg-white p-5 shadow-sm md:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 rounded-xl bg-burning-flame p-3 text-white">
                <ClipboardCheck size={26} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h1 className="break-words text-2xl font-extrabold">Checklist pre-demo</h1>
                <p className="text-sm text-gray-600" data-testid="checklist-resumen">
                  {cargando ? 'Comprobando el ambiente…' : pendientes === 0 ? 'Todo listo para la demo.' : `${pendientes} punto(s) por resolver o revisar.`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void verificar()}
              disabled={cargando}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-oatmeal px-4 text-sm font-semibold hover:bg-palladian disabled:opacity-60"
            >
              <RefreshCw size={16} aria-hidden="true" className={cargando ? 'animate-spin' : ''} />
              Verificar de nuevo
            </button>
          </div>

          {error && (
            <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>
          )}

          <ul className="divide-y divide-oatmeal/60 rounded-xl border border-oatmeal/60">
            {lista.map((fila) => (
              <li key={fila.id} data-testid={`checklist-fila-${fila.id}`} data-estado={fila.estado} className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="break-words font-bold">{fila.titulo}</p>
                  <p className="break-words text-sm text-gray-600">{fila.descripcion}</p>
                  {fila.detalle && <p className="mt-1 break-words text-xs text-gray-500">{fila.detalle}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${CLASE[fila.estado]}`}>{ETIQUETA[fila.estado]}</span>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-xs text-gray-500">
            Estado real del ambiente, consultado al abrir la página. Las migraciones se aplican con db:deploy; esta pantalla solo las comprueba.
          </p>
        </div>
      </div>
    </main>
  );
}
