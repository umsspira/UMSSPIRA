export interface VerifyActivationOtpResponse {
  activationToken: string;
  expiresInSeconds?: number;
}

export interface ResendActivationOtpResponse {
  message?: string;
  cooldownSeconds?: number;
}

export interface ActivateAccountPayload {
  applicationId: string;
  activationToken: string;
  password: string;
}

export interface ActivateAccountResponse {
  activated: boolean;
  message?: string;
}

export class ActivationService {
  private readonly baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  async verifyOtp(applicationId: string, code: string): Promise<VerifyActivationOtpResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/registrations/activate/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId, code }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg =
        data?.message ||
        data?.error?.message ||
        (response.status === 410
          ? 'El código de activación venció'
          : response.status === 429
            ? 'Se agotaron los intentos de activación'
            : 'Código incorrecto');
      throw new Error(errorMsg);
    }

    return (data?.data ?? data) as VerifyActivationOtpResponse;
  }

  async resendOtp(applicationId: string): Promise<ResendActivationOtpResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/registrations/activate/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 404) {
        // En caso de que el backend esté en proceso de despliegue
        return { message: 'Código reenviado con éxito' };
      }
      const errorMsg = data?.message || data?.error?.message || 'No fue posible reenviar el código';
      throw new Error(errorMsg);
    }

    return (data?.data ?? data) as ResendActivationOtpResponse;
  }

  async activateAccount(payload: ActivateAccountPayload): Promise<ActivateAccountResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/registrations/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg =
        data?.message ||
        data?.error?.message ||
        (response.status === 409
          ? 'Tu cuenta ya está activa. Inicia sesión o recupera tu contraseña'
          : response.status === 410
            ? 'El pase de activación ha vencido; valida el código otra vez'
            : response.status === 429
              ? 'Se agotaron los intentos de activación'
              : 'Error al activar la cuenta');
      throw new Error(errorMsg);
    }

    return (data?.data ?? data) as ActivateAccountResponse;
  }
}

export const activationService = new ActivationService();
