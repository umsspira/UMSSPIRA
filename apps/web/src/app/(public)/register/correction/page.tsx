import { RequestCorrectionLinkForm } from "@/modules/applications/frontend/components/request-correction-link-form";

export default function CorrectionBasePage() {
  return (
    <main className="min-h-screen bg-[#EDE8DE] px-4 py-10">
      <section className="mx-auto mt-16 max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">
          Solicitar enlace de corrección
        </h1>

        <p className="mt-3 text-sm text-slate-600">
          Si tu solicitud fue observada y necesitas un nuevo
          enlace para corregirla, puedes solicitarlo aquí.
        </p>

        <RequestCorrectionLinkForm />
      </section>
    </main>
  );
}
