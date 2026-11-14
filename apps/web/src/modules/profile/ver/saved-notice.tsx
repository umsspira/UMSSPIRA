import { Check, X } from 'lucide-react';

// Aviso de éxito al volver al resumen tras «Guardar perfil profesional» (HU-21, CA-01).
// Estilo de éxito del sitio: fondo blanco con ícono en círculo Blue Fantastic; se cierra con la X.
export default function SavedNotice({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-xl border border-oatmeal bg-white px-4 py-3 text-sm font-semibold text-blue-fantastic shadow-sm"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-fantastic" aria-hidden="true">
        <Check className="h-4 w-4 text-white" />
      </span>
      <span className="flex-1">Se guardó correctamente</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar aviso"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-blue-fantastic/70 transition hover:bg-palladian"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
