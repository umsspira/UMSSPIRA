import { Suspense } from "react";
import { AuthBrandHeader } from "@/modules/auth/frontend/components/auth-brand-header";
import { ResetPasswordForm } from "../../../modules/auth/frontend/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#EEE9DF] px-6 py-10 sm:px-10">
      <div className="w-full max-w-[460px] space-y-6">
        <AuthBrandHeader />

        <div className="rounded-2xl border border-oatmeal/60 bg-white p-8 shadow-xl shadow-abyssal-blue/5 sm:p-10">
          <h1 className="font-display text-3xl font-bold tracking-tight text-abyssal-blue">
            Crea tu nueva contraseña
          </h1>
          <p className="mt-2 text-sm text-abyssal-blue/70">
            Elige una contraseña segura para volver a iniciar sesión en tu cuenta.
          </p>
          <div className="mt-8">
            <Suspense fallback={null}>
              <ResetPasswordForm />
            </Suspense>
          </div>
        </div>

        <footer className="text-center text-[11px] text-abyssal-blue/60">
          <p className="uppercase tracking-wider">Universidad Mayor de San Simón • DTI & DPA</p>
        </footer>
      </div>
    </main>
  );
}