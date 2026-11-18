import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
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

  it('muestra el expediente completo, aviso urgente y enlace conservando filtros', async () => {
    mockedFetchDetail.mockResolvedValue({ ok: true, data: sampleDetail });

    render(<ApplicationDetailPage applicationId="app-1" />);

    expect(await screen.findByText('EXPEDIENTE: EGR-2026-001')).toBeInTheDocument();
    expect(screen.getAllByText(/Urgente \(>48h\)/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Volver a la bandeja/i })).toHaveAttribute(
      'href',
      '/applications?page=2&search=test&career=sistemas',
    );
    expect(screen.getByText('Juan')).toBeInTheDocument();
    expect(screen.getByText('Pérez')).toBeInTheDocument();
    expect(screen.getByTestId('ocr-panel')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Aprobar' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Observar' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Rechazar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revisar dictamen' })).toBeInTheDocument();
  });

  it('abre la vista previa del dictamen al elegir Aprobar y pulsar Revisar dictamen', async () => {
    mockedFetchDetail.mockResolvedValue({ ok: true, data: sampleDetail });

    render(<ApplicationDetailPage applicationId="app-1" />);

    fireEvent.click(await screen.findByRole('radio', { name: 'Aprobar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Revisar dictamen' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Vista previa del dictamen')).toBeInTheDocument();
  });
});