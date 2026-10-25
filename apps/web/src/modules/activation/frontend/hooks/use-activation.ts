'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { maskEmail } from '@/shared/utils/mask-email';
import { activationService } from '../services/activation.service';

export interface UseActivationOptions {
  applicationId: string;
  email?: string;
  onSuccess?: (activationToken: string) => void;
}

const STORAGE_PREFIX = 'umss_activation_cooldown_';

export function formatCooldownTime(seconds: number): string {
  if (seconds <= 0) return '00:00';
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function useActivation({ applicationId, email = '', onSuccess }: UseActivationOptions) {
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isOtpInvalidated, setIsOtpInvalidated] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [activationToken, setActivationToken] = useState<string | null>(null);

  const maskedEmail = useMemo(() => {
    return email ? maskEmail(email) : 'alumni.sistemas@umss.edu.bo';
  }, [email]);

  // Recuperar contador y cooldown guardado para el applicationId
  useEffect(() => {
    if (!applicationId || typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${applicationId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        const expiresAt = parsed.expiresAt ? Number(parsed.expiresAt) : 0;
        const now = Date.now();
        if (expiresAt > now) {
          setCooldownSeconds(Math.ceil((expiresAt - now) / 1000));
        }
        if (typeof parsed.resendCount === 'number') {
          setResendCount(parsed.resendCount);
        }
        if (typeof parsed.failedAttempts === 'number') {
          setFailedAttempts(parsed.failedAttempts);
        }
      }
    } catch {
      // Ignorar errores de almacenamiento local
    }
  }, [applicationId]);

  // Temporizador de cuenta regresiva para cooldown
  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const interval = setInterval(() => {
      setCooldownSeconds((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const saveCooldown = useCallback(
    (newResendCount: number, durationSeconds: number) => {
      if (!applicationId || typeof window === 'undefined') return;
      try {
        const expiresAt = Date.now() + durationSeconds * 1000;
        localStorage.setItem(
          `${STORAGE_PREFIX}${applicationId}`,
          JSON.stringify({ resendCount: newResendCount, expiresAt, failedAttempts }),
        );
      } catch {
        // Ignorar
      }
    },
    [applicationId, failedAttempts],
  );

  const handleDigitChange = useCallback((index: number, digit: string) => {
    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    setError(null);
  }, []);

  const handleFullOtp = useCallback((digits: string[]) => {
    setOtpDigits(digits.slice(0, 6));
    setError(null);
  }, []);

  const fullCode = otpDigits.join('');
  const isCodeComplete = otpDigits.every((d) => d.trim() !== '') && fullCode.length === 6;

  // CA-06.2 y CA-06.4: Verificar OTP
  const verifyCode = useCallback(async () => {
    if (!isCodeComplete || isVerifying || isResending || isOtpInvalidated) return;

    setIsVerifying(true);
    setError(null);

    try {
      const response = await activationService.verifyOtp(applicationId, fullCode);
      setActivationToken(response.activationToken);
      setSuccessMessage('¡Código verificado con éxito!');
      setError(null);
      onSuccess?.(response.activationToken);
    } catch (err: unknown) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= 5) {
        setIsOtpInvalidated(true);
        setError(
          'Has superado los 5 intentos permitidos. El código ha sido invalidado; solicita uno nuevo.',
        );
      } else {
        const msg = err instanceof Error ? err.message : 'Código incorrecto';
        setError(`${msg} (intento ${newAttempts} de 5)`);
      }
    } finally {
      setIsVerifying(false);
    }
  }, [
    isCodeComplete,
    isVerifying,
    isResending,
    isOtpInvalidated,
    applicationId,
    fullCode,
    failedAttempts,
    onSuccess,
  ]);

  // CA-06.5 y CA-06.6: Reenviar código con bloqueos de 15 min (5to) y 2 horas (10mo)
  const resendCode = useCallback(async () => {
    if (cooldownSeconds > 0 || isResending || isVerifying) return;

    setIsResending(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await activationService.resendOtp(applicationId);

      const nextResendCount = resendCount + 1;
      setResendCount(nextResendCount);

      // Reiniciar código y fallos tras nuevo envío
      setOtpDigits(['', '', '', '', '', '']);
      setFailedAttempts(0);
      setIsOtpInvalidated(false);
      setSuccessMessage('Se ha enviado un nuevo código a tu correo.');

      // Regla CA-06.5: Al completar 5 reenvíos -> Bloqueo 15 minutos (900 seg)
      if (nextResendCount === 5) {
        const duration = 15 * 60;
        setCooldownSeconds(duration);
        saveCooldown(nextResendCount, duration);
      }
      // Regla CA-06.6: Al completar 10 reenvíos -> Bloqueo 2 horas (7200 seg)
      else if (nextResendCount >= 10) {
        const duration = 2 * 60 * 60;
        setCooldownSeconds(duration);
        saveCooldown(0, duration); // Al expirar las 2 horas, reinicia ciclo
        setResendCount(0);
      } else {
        saveCooldown(nextResendCount, 0);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No fue posible reenviar el código';
      setError(msg);
    } finally {
      setIsResending(false);
    }
  }, [cooldownSeconds, isResending, isVerifying, applicationId, resendCount, saveCooldown]);

  const isLocked = cooldownSeconds > 0;
  const cooldownFormatted = useMemo(() => formatCooldownTime(cooldownSeconds), [cooldownSeconds]);

  return {
    otpDigits,
    fullCode,
    isCodeComplete,
    maskedEmail,
    isVerifying,
    isResending,
    isLocked,
    error,
    successMessage,
    failedAttempts,
    isOtpInvalidated,
    resendCount,
    cooldownSeconds,
    cooldownFormatted,
    activationToken,
    handleDigitChange,
    handleFullOtp,
    verifyCode,
    resendCode,
  };
}
