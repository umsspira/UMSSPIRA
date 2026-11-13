import { apiClient, ApiClientError } from '@/shared/services/api-client';
import { validateScannedPass } from './validate-scanned-pass';

jest.mock('@/shared/services/api-client', () => ({
  ...jest.requireActual('@/shared/services/api-client'),
  apiClient: jest.fn(),
}));

describe('Contrato HTTP de validación QR', () => {
  const signal = new AbortController().signal;
  beforeEach(() => jest.resetAllMocks());

  it('usa la sesión del cliente y envía únicamente el token del escáner', async () => {
    jest.mocked(apiClient).mockResolvedValue({ data: { code: 'PASS_VALIDATED', attendanceRecorded: false } });
    await validateScannedPass('evento/1', 'token', signal);
    expect(apiClient).toHaveBeenCalledWith('/api/v1/events/owned/evento%2F1/attendance', {
      method: 'POST', authenticated: true, body: { qrToken: 'token' }, signal,
    });
  });

  it.each([
    null,
    { data: null },
    { data: { code: 'PASS_VALIDATED', attendanceRecorded: true } },
    { data: { code: 'DESCONOCIDO', attendanceRecorded: false } },
  ])('rechaza una respuesta incompatible con el contrato (%#)', async (response) => {
    jest.mocked(apiClient).mockResolvedValue(response);
    await expect(validateScannedPass('evento', 'token', signal)).rejects.toThrow('respuesta de validación inesperada');
  });

  it('conserva el código de rechazo que proporciona el cliente HTTP compartido', async () => {
    const error = new ApiClientError('El pase ha vencido', 410, 'PASS_EXPIRED');
    jest.mocked(apiClient).mockRejectedValue(error);
    await expect(validateScannedPass('evento', 'token', signal)).rejects.toBe(error);
  });
});
