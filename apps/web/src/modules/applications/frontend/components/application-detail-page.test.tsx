import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { authenticatedFetch } from '@/shared/services/auth-session';
import { ApplicationDetailPage } from './application-detail-page';
import {
  fetchApplicationDetail,
  fetchDocumentUrl,
} from '../services/applications-board.service';

jest.mock('../services/applications-board.service', () => ({
  fetchApplicationDetail: jest.fn(),
  fetchDocumentUrl: jest.fn(),
  retryMailEvent: jest.fn(),
}));

jest.mock('../services/ocr-api', () => ({
  ocrRequest: jest.fn().mockResolvedValue([]),
}));

jest.mock('./ocr-panel', () => ({
  OcrPanel: () => <div data-testid="ocr-panel">Panel OCR</div>,
}));

jest.mock('../hooks/use-ocr-runner', () => ({ useOcrRunner: jest.fn() }));
jest.mock('./history-tab', () => ({
  HistoryTab: ({ applicationId }: { applicationId: string }) => <p>Historial de {applicationId}</p>,
}));
jest.mock('@/shared/services/auth-session', () => ({ authenticatedFetch: jest.fn() }));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockSearchParams = new URLSearchParams('page=2&search=test&career=sistemas');
jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

const mockedFetchDetail = fetchApplicationDetail as jest.Mock;
const mockedFetchDoc = fetchDocumentUrl as jest.Mock;

const sampleDetail = {
  id: 'app-1',
  code: 'EGR-2026-001',
  status: 'PENDIENTE',
  firstName: 'Juan',
  lastName: 'Pérez',
  email: 'juan@umss.edu',
  ci: '1234567',
  issuedIn: 'CB',
  phone: '77712345',
  sisCode: '202001001',
  career: 'Ingeniería de Sistemas',
  careerId: 'c-1',
  graduationYear: 2024,
  submittedAt: new Date(Date.now() - 50 * 3600 * 1000).toISOString(),
  documentName: 'diploma.pdf',
  documentPath: 'docs/diploma.pdf',
  documentFormat: 'PDF',
  version: 2,
  reviewNotification: null,
  reviewSummary: {
    observations: 0,
    maxObservations: 2,
    rejections: 0,
    maxRejections: 5,
    latestObservation: null,
    canObserve: true,
  },
};

describe('ApplicationDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authenticatedFetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });
    mockedFetchDoc.mockResolvedValue({
      ok: true,
      data: { url: 'https://docs.local/diploma.pdf' },
    });
  });

  it('muestra estado de carga mientras obtiene el expediente', () => {
    mockedFetchDetail.mockReturnValue(new Promise(() => {}));
    render(<ApplicationDetailPage applicationId="app-1" />);
    expect(screen.getByText(/Cargando expediente…/i)).toBeInTheDocument();
  });

  it('muestra aviso de inicio de sesión si se requiere autenticación', async () => {
    mockedFetchDetail.mockResolvedValue({
      ok: false,
      needsLogin: true,
      status: 401,
      message: 'Sesión expirada',
    });

    render(<ApplicationDetailPage applicationId="app-1" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Sesión expirada');
    expect(screen.getByRole('link', { name: /Ir al inicio de sesión/i })).toHaveAttribute('href', '/login');
  });

  it('muestra mensaje de error si no se tienen permisos o falla la consulta', async () => {
    mockedFetchDetail.mockResolvedValue({
      ok: false,
      needsLogin: false,
      status: 403,
      message: 'No tienes permiso para ver esta carrera.',
    });

    render(<ApplicationDetailPage applicationId="app-1" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('No tienes permiso para ver esta carrera.');
    expect(screen.getByRole('link', { name: /Volver a la bandeja/i })).toHaveAttribute(
      'href',
      '/applications?page=2&search=test&career=sistemas',
    );
  });

  it('muestra el expediente, el historial bajo el documento y los tres botones originales sin pestañas', async () => {
    mockedFetchDetail.mockResolvedValue({ ok: true, data: sampleDetail });
    render(<ApplicationDetailPage applicationId="app-1" />);
    expect(await screen.findByText('EXPEDIENTE: EGR-2026-001')).toBeVisible();
    expect(screen.getByText('Juan Pérez')).toBeVisible();
    expect(screen.getByText('Titulado:')).toBeVisible();
    expect(screen.getByRole('link', { name: /Volver a la bandeja/ })).toHaveAttribute(
      'href', '/applications?page=2&search=test&career=sistemas',
    );
    const document = screen.getByRole('region', { name: 'Documento de respaldo' });
    const history = screen.getByRole('region', { name: 'Historial del expediente' });
    expect(document.parentElement).toContainElement(history);
    expect(document.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Historial de app-1')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Historial' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    for (const name of ['Aprobar', 'Observar', 'Rechazar']) {
      expect(screen.getByRole('button', { name, exact: true })).toBeEnabled();
    }
    expect(screen.getByTestId('ocr-panel')).toBeInTheDocument();
  });

  it.each([
    { label: 'Aprobar', decision: 'APROBADA', confirm: 'Confirmar Aprobación' },
    { label: 'Observar', decision: 'OBSERVADA', confirm: 'Confirmar Observación' },
    { label: 'Rechazar', decision: 'RECHAZADA', confirm: 'Confirmar Rechazo' },
  ])('abre el diálogo original de $label y conserva su confirmación', async ({ label, decision, confirm }) => {
    mockedFetchDetail.mockResolvedValue({ ok: true, data: sampleDetail });
    render(<ApplicationDetailPage applicationId="app-1" />);
    fireEvent.click(await screen.findByRole('button', { name: label, exact: true }));
    expect(await screen.findByRole('dialog')).toBeVisible();
    expect(authenticatedFetch).not.toHaveBeenCalled();
    if (decision === 'OBSERVADA') {
      fireEvent.click(screen.getByLabelText('Documento ilegible o borroso'));
      fireEvent.change(screen.getByLabelText(/Qué debe corregir el Titulado/), {
        target: { value: 'El documento presentado no se puede leer.' },
      });
    }
    if (decision === 'RECHAZADA') {
      fireEvent.change(screen.getByLabelText(/Causal de rechazo definitivo/), {
        target: { value: 'Trámite duplicado' },
      });
      fireEvent.change(screen.getByLabelText(/Justificación del rechazo/), {
        target: { value: 'La solicitud corresponde a un trámite duplicado.' },
      });
      fireEvent.click(screen.getByLabelText(/Confirmo que he cotejado los antecedentes/));
    }
    fireEvent.click(screen.getByRole('button', { name: confirm, exact: true }));
    await waitFor(() => expect(authenticatedFetch).toHaveBeenCalledWith(
      '/api/v1/applications/app-1/review', expect.objectContaining({ method: 'POST' }),
    ));
    const payload = JSON.parse((authenticatedFetch as jest.Mock).mock.calls[0][1].body);
    expect(payload.decision).toBe(decision);
    if (decision === 'OBSERVADA') expect(payload.motivos).toEqual(['documento_ilegible']);
    if (decision === 'RECHAZADA') expect(payload.category).toBe('Trámite duplicado');
    await waitFor(() => expect(mockedFetchDetail).toHaveBeenCalledTimes(2));
  });

  it('mantiene el diálogo original y muestra el error si el dictamen falla', async () => {
    mockedFetchDetail.mockResolvedValue({ ok: true, data: sampleDetail });
    (authenticatedFetch as jest.Mock).mockResolvedValue({ ok: false, status: 500, json: async () => null });
    render(<ApplicationDetailPage applicationId="app-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Aprobar', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Aprobación' }));
    expect(await screen.findByText('No se pudo registrar el dictamen. Intenta de nuevo.')).toBeVisible();
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(mockedFetchDetail).toHaveBeenCalledTimes(1);
  });

  it('deshabilita Observar al alcanzar su límite y permite cancelar sin enviar', async () => {
    mockedFetchDetail.mockResolvedValue({ ok: true, data: {
      ...sampleDetail, reviewSummary: { ...sampleDetail.reviewSummary, canObserve: false },
    } });
    render(<ApplicationDetailPage applicationId="app-1" />);
    expect(await screen.findByRole('button', { name: 'Observar', exact: true })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar', exact: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(authenticatedFetch).not.toHaveBeenCalled();
  });
});
