'use client';
import { useState, useEffect, useRef } from 'react';
import { ChevronRight, Loader2, RefreshCcw, CheckCircle2, XCircle, AlertCircle, FileText } from 'lucide-react';
// 👉 Ajusta esta ruta si tu auth-session.ts está en otra carpeta (ej: '@/lib/auth-session' o '@/shared/auth/auth-session')
import { authenticatedFetch } from '@/shared/services/auth-session';

interface GenerateCertificatesProps {
  eventId: string;
  estadoEvento: string;
  tienePlantillaActiva: boolean;
}

interface CertificadoResultado {
  exitosos: number;
  fallidos: number;
  procesados: number;
  detalles?: Array<{
    id_usuario: string;
    nombre: string;
    estado: 'GENERADO' | 'ERROR' | 'SIN_ASISTENCIA';
  }>;
}

export const GenerateCertificatesPanel = ({
  eventId,
  estadoEvento,
  tienePlantillaActiva,
}: GenerateCertificatesProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultado, setResultado] = useState<CertificadoResultado | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  const eventoNoFinalizado = estadoEvento !== 'FINALIZADO';
  const faltaPlantilla = !tienePlantillaActiva;
  const esBloqueante = eventoNoFinalizado || faltaPlantilla;

  useEffect(() => {
    return () => stopPolling();
  }, []);

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
        setProgress(data.progress);

        if (data.status === 'COMPLETADO') {
          stopPolling();

          const dataFinal = {
            ...data.results,
            detalles: data.results?.detalles || [
              { id_usuario: '1', nombre: 'Ana García (Simulado)', estado: 'GENERADO' },
              { id_usuario: '2', nombre: 'Carlos López (Simulado)', estado: 'ERROR' },
              { id_usuario: '3', nombre: 'María Rodríguez (Simulado)', estado: 'SIN_ASISTENCIA' },
            ],
          };

          setResultado(dataFinal);
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
    setResultado(null);

    try {
      const response = await authenticatedFetch(`/api/v1/events/${eventId}/certificates/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        let errorMsg = `Error ${response.status}: No se pudo iniciar la generación.`;
        try {
          const errBody = await response.json();
          if (errBody?.error?.message) errorMsg = errBody.error.message;
          else if (errBody?.message) errorMsg = Array.isArray(errBody.message) ? errBody.message.join(', ') : errBody.message;
        } catch {
          // Mantener mensaje por defecto
        }
        throw new Error(errorMsg);
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
    } catch (err) {
      console.error('Error al abrir PDF:', err);
      alert('No se pudo abrir el PDF del certificado.');
    }
  };

  if (resultado && !isGenerating) {
    return (
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 font-sans">Resumen de Emisión</h3>
          <p className="text-sm text-slate-500 mt-1 font-sans">El proceso de generación por lotes ha concluido.</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-slate-700">{resultado.procesados}</span>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">Procesados</span>
          </div>
          <div className="p-4 bg-green-50 rounded-xl border border-green-100 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-green-600">{resultado.exitosos}</span>
            <span className="text-xs font-medium text-green-700 uppercase tracking-wide mt-1">Exitosos</span>
          </div>
          <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-red-600">{resultado.fallidos}</span>
            <span className="text-xs font-medium text-red-700 uppercase tracking-wide mt-1">Fallidos</span>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm font-sans">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Participante</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {resultado.detalles?.map((row) => (
                <tr key={row.id_usuario} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-slate-900 font-medium">{row.nombre}</td>
                  <td className="px-4 py-3">
                    {row.estado === 'GENERADO' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-md border border-green-200">
                        <CheckCircle2 className="w-3 h-3" /> Exitoso
                      </span>
                    )}
                    {row.estado === 'ERROR' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded-md border border-red-200">
                        <XCircle className="w-3 h-3" /> Error
                      </span>
                    )}
                    {row.estado === 'SIN_ASISTENCIA' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                        <AlertCircle className="w-3 h-3" /> Sin Asistencia
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.estado === 'GENERADO' && (
                      <button
                        onClick={() => handleVerPdf(row.id_usuario)}
                        className="text-blue-600 hover:underline text-xs font-medium flex items-center justify-end gap-1 ml-auto"
                      >
                        <FileText className="w-3 h-3" /> Ver PDF
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {resultado.fallidos > 0 ? (
          <div className="flex items-center justify-between bg-red-50 p-4 rounded-xl border border-red-100">
            <p className="text-sm text-red-800 font-medium font-sans">
              Hubo errores en {resultado.fallidos} certificados.
            </p>
            <button
              onClick={handleGenerar}
              className="py-2 px-4 rounded-lg font-bold font-sans text-sm bg-red-600 text-white hover:bg-red-700 flex items-center gap-2 transition-colors shadow-sm"
            >
              <RefreshCcw className="w-4 h-4" /> Reintentar Fallidos
            </button>
          </div>
        ) : (
          <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
            <p className="text-sm text-green-800 font-medium font-sans flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Todos los certificados fueron generados con éxito.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-5">
      <div>
        <h3 className="text-lg font-bold text-slate-900 font-sans">Emisión de Certificados</h3>
        <p className="text-sm text-slate-500 mt-1 font-sans">
          Genera automáticamente los certificados digitales para los participantes con asistencia.
        </p>
      </div>

      <div className="space-y-3">
        {eventoNoFinalizado && (
          <div className="p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-sm font-sans flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <p>
              <strong>Evento no finalizado:</strong> El evento debe estar marcado como FINALIZADO para emitir
              certificados.
            </p>
          </div>
        )}
        {!eventoNoFinalizado && faltaPlantilla && (
          <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-xl text-sm font-sans flex items-start gap-3">
            <span className="text-lg">❌</span>
            <p>
              <strong>Falta plantilla base:</strong> Debes subir una plantilla PDF antes de generar el lote.
            </p>
          </div>
        )}
      </div>

      {error && !isGenerating && (
        <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-xl text-sm font-sans flex items-start gap-3">
          <span className="text-lg">❌</span>
          <p>{error}</p>
        </div>
      )}

      {isGenerating && (
        <div className="w-full mt-2">
          <div className="flex justify-between mb-1 text-xs font-medium text-slate-600">
            <span>Procesando certificados...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
            <div
              className="bg-amber-500 h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      <button
        onClick={handleGenerar}
        disabled={esBloqueante || isGenerating}
        className={`mt-2 py-3 px-6 rounded-xl font-bold font-sans transition-all w-full sm:w-auto flex items-center justify-center gap-2
          ${
            esBloqueante
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              : isGenerating
                ? 'bg-amber-50 text-amber-600 cursor-wait border border-amber-200'
                : 'bg-[#111827] text-white hover:bg-slate-800 hover:shadow-md'
          }`}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
          </>
        ) : (
          <>
            Generar Lote <ChevronRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
};