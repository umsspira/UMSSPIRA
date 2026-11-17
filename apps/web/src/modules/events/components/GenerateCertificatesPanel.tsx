'use client';
import { useState } from 'react';
import { Bookmark, Calendar, ChevronRight } from 'lucide-react'; // Usamos iconos que ya tienes

interface GenerateCertificatesProps {
  eventId: string;
  estadoEvento: string; 
  tienePlantillaActiva: boolean;
}

export const GenerateCertificatesPanel = ({ 
  eventId, 
  estadoEvento, 
  tienePlantillaActiva 
}: GenerateCertificatesProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultado, setResultado] = useState<{ exitosos: number; fallidos: number; procesados: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Precondiciones T4
  const eventoNoFinalizado = estadoEvento !== 'FINALIZADO';
  const faltaPlantilla = !tienePlantillaActiva;
  const esBloqueante = eventoNoFinalizado || faltaPlantilla;

  const handleGenerar = async () => {
    setIsGenerating(true);
    setError(null);
    setResultado(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events/${eventId}/certificates/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Ocurrió un error en el servidor al generar el lote.');

      const responseData = await response.json();
      setResultado(responseData.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-5">
      
      {/* Header del Panel */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 font-sans">Emisión de Certificados</h3>
        <p className="text-sm text-slate-500 mt-1 font-sans">
          Genera automáticamente los certificados digitales para los participantes con asistencia.
        </p>
      </div>

      {/* Estados Bloqueantes (T4) */}
      <div className="space-y-3">
        {eventoNoFinalizado && (
          <div className="p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-sm font-sans flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <p><strong>Evento no finalizado:</strong> El evento debe estar marcado como FINALIZADO para emitir certificados.</p>
          </div>
        )}

        {!eventoNoFinalizado && faltaPlantilla && (
          <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-xl text-sm font-sans flex items-start gap-3">
            <span className="text-lg">❌</span>
            <p><strong>Falta plantilla base:</strong> Debes subir una plantilla PDF en la sección de diseño antes de generar el lote.</p>
          </div>
        )}
      </div>

      {/* Resultados / Errores */}
      {resultado && (
        <div className="p-4 bg-[#FDFBF7] text-slate-800 border border-slate-200 rounded-xl text-sm font-sans flex items-start gap-3">
          <span className="text-lg">✅</span>
          <p><strong>Lote completado:</strong> Se emitieron {resultado.exitosos} certificados de {resultado.procesados} participantes válidos.</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-xl text-sm font-sans flex items-start gap-3">
          <span className="text-lg">❌</span>
          <p>{error}</p>
        </div>
      )}

      {/* Botón de Acción */}
      <button
        onClick={handleGenerar}
        disabled={esBloqueante || isGenerating}
        className={`mt-2 py-3 px-6 rounded-xl font-bold font-sans transition-all w-full sm:w-auto flex items-center justify-center gap-2
          ${esBloqueante 
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
            : isGenerating 
              ? 'bg-amber-400 text-white cursor-wait opacity-80' 
              : 'bg-[#111827] text-white hover:bg-slate-800 hover:shadow-md'
          }`}
      >
        {isGenerating ? 'Procesando...' : 'Generar Lote'}
        {!isGenerating && <ChevronRight className="w-4 h-4" />}
      </button>
    </div>
  );
};