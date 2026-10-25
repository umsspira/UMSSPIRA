'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ActivateOtpStep, ActivatePasswordStep } from '@/modules/activation';
import { KeyRound, ArrowRight } from 'lucide-react';

export function ActivateView() {
  const searchParams = useSearchParams();
  const queryAppId =
    searchParams.get('applicationId') ||
    searchParams.get('id') ||
    searchParams.get('solicitud') ||
    '';
  const emailParam = searchParams.get('email') || '';

  const [manualAppId, setManualAppId] = useState('');
  const [hasConfirmedId, setHasConfirmedId] = useState(false);
  const [step, setStep] = useState<'otp' | 'password'>('otp');
  const [activationToken, setActivationToken] = useState<string | null>(null);

  const effectiveAppId = queryAppId || (hasConfirmedId ? manualAppId.trim() : '');

  const handleOtpSuccess = (token: string) => {
    setActivationToken(token);
    setStep('password');
  };

  // Si no hay applicationId en la URL y aún no se ingresó manualmente
  if (!effectiveAppId) {
    return (
      <div className="w-full max-w-xl rounded-2xl border border-oatmeal/70 bg-white p-6 shadow-xl shadow-abyssal-blue/5 sm:p-10">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-burning-flame/10 text-burning-flame">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-abyssal-blue sm:text-2xl">
              Activación de Cuenta
            </h1>
            <p className="text-xs text-abyssal-blue/70">
              Ingresa el identificador de tu solicitud para continuar
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manualAppId.trim()) setHasConfirmedId(true);
          }}
          className="mt-6 space-y-4"
        >
          <div>
            <label
              htmlFor="applicationId"
              className="block text-xs font-semibold uppercase tracking-wider text-abyssal-blue/80"
            >
              Número de Solicitud (UUID)
            </label>
            <input
              id="applicationId"
              type="text"
              value={manualAppId}
              onChange={(e) => setManualAppId(e.target.value)}
              placeholder="Ej. 0b0f6b0e-6a43-4c53-9a0e-2f8f7d6c9a11"
              required
              className="mt-1.5 w-full rounded-xl border border-oatmeal/80 px-4 py-2.5 font-mono text-sm text-abyssal-blue placeholder:text-abyssal-blue/40 focus:border-burning-flame focus:outline-none focus:ring-1 focus:ring-burning-flame"
            />
            <p className="mt-1.5 text-[11px] text-abyssal-blue/60">
              Encuentras este código en el correo de aprobación que te enviamos.
            </p>
          </div>

          <button
            type="submit"
            disabled={!manualAppId.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-burning-flame py-3 text-sm font-bold text-abyssal-blue transition hover:bg-burning-flame/90 disabled:opacity-50"
          >
            Continuar a verificación
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    );
  }

  // CA-06.3: Solo accesible tras validar OTP con pase firmado emitido por el servidor
  if (step === 'password' && activationToken) {
    return (
      <ActivatePasswordStep
        applicationId={effectiveAppId}
        activationToken={activationToken}
        onBackToOtp={() => setStep('otp')}
      />
    );
  }

  return (
    <ActivateOtpStep
      applicationId={effectiveAppId}
      email={emailParam}
      onSuccess={handleOtpSuccess}
    />
  );
}