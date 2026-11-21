import { AuthBrandHeader } from "@/modules/auth/frontend/components/auth-brand-header";
import { StatusQueryForm } from "@/modules/status-query/frontend/components/status-query-form";

export default function StatusPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#EEE9DF] px-6 py-10 sm:px-10">
      <div className="w-full max-w-[460px] space-y-6">
        <AuthBrandHeader />

        <section className="rounded-2xl border border-oatmeal/60 bg-white p-8 shadow-xl shadow-abyssal-blue/5 sm:p-10">
          <h1 className="font-display text-3xl font-bold tracking-tight text-abyssal-blue">
            Consulta el estado de tu solicitud
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-abyssal-blue/70">
            Ingresa el correo utilizado durante el registro. Por seguridad, el
            resultado será enviado únicamente al correo verificado de la
            solicitud.
          </p>

          <div className="mt-8">
            <StatusQueryForm />
          </div>
        </section>

        <footer className="text-center text-[11px] text-abyssal-blue/60">
          <p className="uppercase tracking-wider">
            UNIVERSIDAD MAYOR DE SAN SIMÓN • DTI &amp; DPA
          </p>
        </footer>
      </div>
    </main>
  );
}