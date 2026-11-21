
import type { ImageQualityResult } from "../lib/image-quality.types";

interface QualityWarningProps {
  result: ImageQualityResult;
}

export function QualityWarning({ result }: QualityWarningProps) {
  if (result.status === "idle" || result.status === "skipped") {
    return null;
  }

  if (result.status === "analyzing") {
    return (
      <div role="status" className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        Analizando la calidad de la imagen...
      </div>
    );
  }

  if (result.status === "failed") {
    return (
      <div role="status" className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        No se pudo comprobar la calidad de la imagen. Puedes abrirla,
        reemplazarla o continuar si cumple los requisitos de carga.
      </div>
    );
  }

  if (result.warnings.length === 0) {
    return (
      <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        No se detectaron problemas de calidad en la imagen.
      </div>
    );
  }

  return (
    <section
      aria-label="Avisos de calidad de imagen"
      className="rounded-lg border border-amber-300 bg-amber-50 p-4"
    >
      <h3 className="text-sm font-semibold text-amber-900">
        Revisa la calidad de tu imagen
      </h3>

      <p className="mt-1 text-sm text-amber-900">
        Se detectaron posibles problemas de legibilidad.
        Puedes reemplazar la imagen o continuar con ella.
      </p>

      <ul className="mt-3 space-y-3">
        {result.warnings.map((warning) => (
          <li key={warning.code} className="text-sm text-amber-950">
            <p className="font-semibold">{warning.message}</p>
            <p className="mt-1">{warning.recommendation}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
