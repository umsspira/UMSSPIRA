'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, XCircle, FileText, ArrowLeft, Check } from 'lucide-react';
import { authenticatedFetch } from '@/shared/services/auth-session';

interface ParticipanteDetalle {
  id_usuario: string;
  nombre: string;
  estado: 'GENERADO' | 'PENDIENTE' | 'ERROR' | 'SIN_ASISTENCIA';
}

interface SummaryData {
  inscripciones: number;
  asistencias: number;
  sinAsistencia: number;
  emitidos: number;
  detalles: ParticipanteDetalle[];
}

export default function EmitCertificatesPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [loadingEvent, setLoadingEvent] = useState(true);
  const [eventData, setEventData] = useState<any>(null);
  const [summary, setSummary] = useState<SummaryData>({
    inscripciones: 0,
    asistencias: 0,
    sinAsistencia: 0,
    emitidos: 0,
    detalles: [],
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fallidos, setFallidos] = useState(0);
  const [completado, setCompletado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchSummary = useCallback(async () => {
    const res = await authenticatedFetch(`/api/v1/events/${eventId}/certificates/summary`);
    if (res.ok) {
      const data: SummaryData = await res.json();
      setSummary(data);
      if (data.emitidos > 0 && data.emitidos >= data.asistencias && data.asistencias > 0) {
        setCompletado(true);
      }
    }
  }, [eventId]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [templateRes] = await Promise.all([
          authenticatedFetch(`/api/v1/events/${eventId}/certificate-template`),
          fetchSummary(),
        ]);

        if (templateRes.ok) {
          const json = await templateRes.json();
          setEventData(json.data);
        }
      } catch (err) {
        console.error('Error al cargar datos del evento:', err);
      } finally {
        setLoadingEvent(false);
      }
    };

    if (eventId) fetchInitialData();
    return () => stopPolling();
  }, [eventId, fetchSummary]);

  const stopPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  };

  const startPolling = () => {
    pollingInterval.current = setInterval(async () => {
      try {
        const response = await authenticatedFetch(`/api/v1/events/${eventId}/certificates/status`);
        if (!response.ok) return;

        const data = await response.json();
        setProgress(data.progress ?? 0);

        if (data.status === 'COMPLETADO') {
          stopPolling();
          setFallidos(data.results?.fallidos ?? 0);
          await fetchSummary();
          setCompletado(true);
          setIsGenerating(false);
        } else if (data.status === 'ERROR') {
          stopPolling();
          setError('El proceso falló en el servidor.');
          setIsGenerating(false);
        }
      } catch (err) {
        console.error('Error en polling:', err);
      }
    }, 2000);
  };

  const handleGenerar = async () => {
    setIsGenerating(true);
    setProgress(0);
    setError(null);
    setCompletado(false);

    try {
      const response = await authenticatedFetch(`/api/v1/events/${eventId}/certificates/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody?.error?.message || 'No se pudo iniciar la generación.');
      }

      startPolling();
    } catch (err) {
      setError((err as Error).message);
      setIsGenerating(false);
    }
  };

  const handleVerPdf = async (userId: string) => {
    try {
      const response = await authenticatedFetch(`/api/v1/events/${eventId}/certificates/${userId}/download`);
      if (!response.ok) throw new Error('No se pudo descargar el certificado.');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch {
      alert('No se pudo abrir el PDF del certificado.');
    }
  };

  if (loadingEvent) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  const estadoEvento = eventData?.status || 'PUBLICADO';
  const tienePlantilla = !!eventData?.activeTemplate;
  const eventoHabilitado = estadoEvento !== 'BORRADOR' && estadoEvento !== 'CANCELADO';

  const fechaFormateada = eventData?.event?.startDate
    ? new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
        .format(new Date(eventData.event.startDate))
        .replaceAll('.', '')
        .replaceAll(' de ', ' ')
    : 'Fecha no especificada';

  // Título y subtítulo dinámicos según el estado
  let headerTitle = 'Certificados del evento';
  let headerSubtitle = 'Preparamos certificados para las personas que asistieron al evento.';

  if (!tienePlantilla) {
    headerTitle = 'Emisión no disponible';
    headerSubtitle = 'Este evento aún no tiene un modelo de certificado configurado.';
  } else if (!eventoHabilitado) {
    headerTitle = 'Emisión pendiente';
    headerSubtitle = 'Los certificados se habilitarán después de finalizar el evento.';
  } else if (isGenerating) {
    headerTitle = 'Emisión de certificados';
    headerSubtitle = 'Estamos preparando los certificados de participación.';
  } else if (completado) {
    headerTitle = 'Certificados disponibles';
    headerSubtitle = `${summary.emitidos} documentos generados correctamente y vinculados a sus participantes.`;
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-slate-900 font-sans p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Cabecera Principal */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-8 bg-[#F5A65B] rounded-full"></div>
              <h1 className="text-3xl font-serif font-bold text-[#1E293B]">{headerTitle}</h1>
            </div>
            <p className="text-sm text-slate-600 mt-1 ml-4">{headerSubtitle}</p>
          </div>
          <button
            onClick={() => router.push('/events')}
            className="self-start md:self-auto px-5 py-2.5 rounded-xl border border-[#D6CFC2] bg-[#F5F1E8] text-slate-800 text-sm font-medium hover:bg-[#ECE6D9] transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a gestión
          </button>
        </div>

        {/* Tarjeta de Resumen del Evento */}
        <div className="bg-[#F5F1E8] p-6 rounded-2xl border border-[#D6CFC2] border-l-4 border-l-[#F5A65B] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#1E293B]">{eventData?.event?.title || 'Evento Académico'}</h2>
            <p className="text-sm text-slate-600 mt-1">
              {!tienePlantilla
                ? `${fechaFormateada} · No se crearán documentos`
                : !eventoHabilitado
                  ? `${fechaFormateada} · Todavía no corresponde emitir`
                  : `${fechaFormateada} · Plantilla habilitada · ${summary.asistencias} asistencias registradas`}
            </p>
          </div>
          <span
            className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase ${
              !tienePlantilla || !eventoHabilitado || summary.asistencias === 0
                ? 'bg-[#C7BFAE] text-[#1E293B]'
                : 'bg-[#F5A65B] text-[#1E293B]'
            }`}
          >
            {!tienePlantilla
              ? 'SIN PLANTILLA'
              : !eventoHabilitado
                ? 'EN CURSO'
                : isGenerating
                  ? 'GENERANDO'
                  : completado
                    ? 'COMPLETADO'
                    : summary.asistencias === 0
                      ? 'PENDIENTE DE ASISTENCIA'
                      : 'LISTO PARA EMITIR'}
          </span>
        </div>

        {/* ESTADO 0: SIN PLANTILLA (Emisión no disponible) */}
        {!tienePlantilla && (
          <div className="bg-[#F5F1E8] p-8 md:p-10 rounded-2xl border border-[#D6CFC2] space-y-6">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase bg-[#9E472A] text-[#1E293B]/90 text-white">
              EMISIÓN OMITIDA
            </span>

            <div className="space-y-3">
              <h3 className="text-2xl font-serif font-bold text-[#1E293B]">
                No existe un modelo de certificado activo
              </h3>
              <p className="text-sm text-slate-600 max-w-2xl">
                El evento puede continuar sin certificados. Si deseas emitirlos, configura un modelo desde Certificados
                del evento.
              </p>
            </div>

            <div className="pt-4">
              <button
                onClick={() => router.push(`/events/${eventId}/certificates`)}
                className="px-6 py-3 rounded-xl bg-[#FFA852] hover:bg-[#F5973D] text-[#1E293B] text-sm font-bold transition-colors shadow-sm"
              >
                Ir a configurar plantilla
              </button>
            </div>
          </div>
        )}

        {/* ESTADO 1: EVENTO NO HABILITADO / EN CURSO */}
        {tienePlantilla && !eventoHabilitado && (
          <div className="bg-[#F5F1E8] p-8 md:p-10 rounded-2xl border border-[#D6CFC2] space-y-5">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase bg-[#C7BFAE] text-[#1E293B]">
              AÚN NO DISPONIBLE
            </span>
            <h3 className="text-2xl font-serif font-bold text-[#1E293B]">
              La actividad debe finalizar antes de emitir documentos
            </h3>
            <p className="text-sm text-slate-600">
              Los certificados estarán disponibles cuando termine el evento y se registre la asistencia.
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-xl text-sm flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-600" />
            <p>{error}</p>
          </div>
        )}

        {/* ESTADO 2: LISTO PARA EMITIR */}
        {tienePlantilla && eventoHabilitado && !isGenerating && !completado && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-3xl font-bold text-slate-800">{summary.inscripciones}</span>
                  <p className="text-xs font-medium text-slate-500 mt-2">Inscripciones confirmadas</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-3xl font-bold text-slate-800">{summary.asistencias}</span>
                  <p className="text-xs font-medium text-slate-500 mt-2">Asistencias registradas</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-3xl font-bold text-amber-600">
                    {summary.emitidos > 0 ? `${summary.emitidos}/${summary.asistencias}` : 'PENDIENTE'}
                  </span>
                  <p className="text-xs font-medium text-slate-500 mt-2">Emisión automática</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-serif font-bold text-lg">Condiciones de emisión</h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" /> Evento habilitado
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" /> Modelo de certificado configurado (PDF)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" /> {summary.asistencias} asistencias registradas
                  </li>
                </ul>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {summary.asistencias === 0
                      ? 'Registra al menos una asistencia para emitir certificados.'
                      : 'Los certificados se prepararán automáticamente.'}
                  </span>
                  <button
                    onClick={handleGenerar}
                    disabled={summary.asistencias === 0}
                    className="bg-[#111827] text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Iniciar Generación de Lote ➔
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="font-serif font-bold text-lg">Proceso automático</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">1</span>
                  <span className="text-sm text-slate-700">Comprobando asistencias</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">2</span>
                  <span className="text-sm text-slate-700">Aplicando plantilla</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">3</span>
                  <span className="text-sm text-slate-700">Generando documentos</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">4</span>
                  <span className="text-sm text-slate-700">Preparando descargas</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ESTADO 3: GENERANDO */}
        {tienePlantilla && isGenerating && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="font-serif font-bold text-xl">Generando certificados</h3>
              <p className="text-sm text-slate-600">
                Procesando {summary.asistencias} participaciones válidas en segundo plano...
              </p>

              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                <div
                  className="bg-amber-500 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="text-2xl font-bold text-slate-800">{progress}% completado</div>
              <p className="text-xs text-slate-500">
                Puedes seguir usando la plataforma mientras se preparan los certificados.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="font-serif font-bold text-lg">Preparación en curso</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">1</span>
                  <span className="text-sm">Comprobando asistencia</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">2</span>
                  <span className="text-sm">Usando la plantilla</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">3</span>
                  <span className="text-sm font-bold">Creando documentos</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center">4</span>
                  <span className="text-sm text-slate-400">Preparando descargas</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ESTADO 4: COMPLETADO */}
        {tienePlantilla && completado && !isGenerating && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-3xl font-bold text-slate-800">{summary.emitidos}</span>
                  <p className="text-xs font-medium text-slate-500 mt-2">Certificados emitidos</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-3xl font-bold text-red-600">{fallidos}</span>
                  <p className="text-xs font-medium text-slate-500 mt-2">Archivos con error</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-3xl font-bold text-slate-800">{summary.sinAsistencia}</span>
                  <p className="text-xs font-medium text-slate-500 mt-2">Sin asistencia</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-serif font-bold text-lg">
                    Participantes con asistencia ({summary.detalles.length})
                  </h3>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                    <tr>
                      <th className="px-6 py-3">Titulado</th>
                      <th className="px-6 py-3">Asistencia</th>
                      <th className="px-6 py-3 text-right">Certificado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.detalles.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                          No hay participantes con asistencia registrada en este evento.
                        </td>
                      </tr>
                    ) : (
                      summary.detalles.map((row) => (
                        <tr key={row.id_usuario} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 font-medium text-slate-900">{row.nombre}</td>
                          <td className="px-6 py-4 text-slate-600">REGISTRADA</td>
                          <td className="px-6 py-4 text-right">
                            {row.estado === 'GENERADO' ? (
                              <button
                                onClick={() => handleVerPdf(row.id_usuario)}
                                className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-3 py-1 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors"
                              >
                                <FileText className="w-3 h-3" /> VER PDF
                              </button>
                            ) : (
                              <span className="text-xs font-medium text-slate-400">PENDIENTE</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="font-serif font-bold text-lg">Certificados listos</h3>
              <div className="space-y-4 text-sm text-slate-600">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">1</span>
                  <span>Uno por participante</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">2</span>
                  <span>Solo para su titular</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">3</span>
                  <span>Vinculados al evento</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">4</span>
                  <span>Disponibles en plataforma</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}