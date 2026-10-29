import { render, screen, waitFor } from '@testing-library/react';
import { SurveyReportDashboard } from './survey-report-dashboard';
import { authenticatedFetch } from '@/shared/services/auth-session';
import { SESSION_EXPIRED_EVENT } from '@/modules/auth/frontend/services/session-expired';

jest.mock('@/shared/services/auth-session', () => ({
  ...jest.requireActual('@/shared/services/auth-session'),
  authenticatedFetch: jest.fn(),
}));

const fetchMock = jest.mocked(authenticatedFetch);
const expiredListener = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  window.addEventListener(SESSION_EXPIRED_EVENT, expiredListener);
});

afterEach(() => window.removeEventListener(SESSION_EXPIRED_EVENT, expiredListener));

describe('HU-004 CA-06: sesión caducada al consultar encuestas', () => {
  it('con HTTP 401 abre la alerta de sesión expirada sin mostrar un error de carga', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401 } as Response);
    render(<SurveyReportDashboard />);

    await waitFor(() => expect(expiredListener).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
