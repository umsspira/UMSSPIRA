import { act, fireEvent, render, screen } from '@testing-library/react';
import { ApplicationDrawer } from './application-drawer';
import { fetchApplicationDetail, fetchDocumentUrl } from '../services/applications-board.service';

jest.mock('../services/applications-board.service', () => ({
  fetchApplicationDetail: jest.fn(), fetchDocumentUrl: jest.fn(),
}));
jest.mock('./ocr-panel', () => ({ OcrPanel: () => <p>Panel OCR</p> }));
jest.mock('./observe-dialog', () => ({ ObserveDialog: ({ open }: { open: boolean }) => open ? <p>Formulario observar</p> : null }));
jest.mock('./approve-dialog', () => ({ ApproveDialog: () => null }));
jest.mock('./reject-dialog', () => ({ RejectDialog: () => null }));
jest.mock('./history-tab', () => ({
  HistoryTab: ({ applicationId }: { applicationId: string }) => <section aria-label="Historial de la solicitud">Historial {applicationId}</section>,
}));

describe('T-11.3 acciones del administrador', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchDocumentUrl as jest.Mock).mockResolvedValue({ ok: true, data: { url: 'https://example.com/file.pdf' } });
  });
  it.each([0, 1, 2, 3])('aplica el límite con %i observaciones', async (observations) => {
    (fetchApplicationDetail as jest.Mock).mockResolvedValue({ ok: true, data: {
      id: 'id', status: 'PENDIENTE', firstName: 'Ana', lastName: 'Perez',
      reviewSummary: { observations, maxObservations: 2, rejections: 0, maxRejections: 5,
        latestObservation: null, canObserve: observations < 2 },
    } });
    render(<ApplicationDrawer open applicationId="id" onClose={jest.fn()} />);
    const observe = await screen.findByRole('button', { name: 'Observar' });
    if (observations < 2) {
      expect(observe).toBeEnabled();
      fireEvent.click(observe);
      expect(screen.getByText('Formulario observar')).toBeInTheDocument();
    } else {
      expect(observe).toBeDisabled();
      fireEvent.click(observe);
      expect(screen.queryByText('Formulario observar')).not.toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Aprobar' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeEnabled();
  });

  it('muestra documento e historial juntos, sin pestañas y con el historial debajo del visor', async () => {
    (fetchApplicationDetail as jest.Mock).mockResolvedValue({ ok: true, data: {
      id: 'id', status: 'PENDIENTE', firstName: 'Ana', lastName: 'Perez', documentName: 'titulo.pdf',
    } });
    render(<ApplicationDrawer open applicationId="id" onClose={jest.fn()} />);

    await screen.findByRole('button', { name: 'Aprobar' });
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument();
    const document = screen.getByLabelText('Documento adjunto: titulo.pdf');
    const history = screen.getByRole('region', { name: 'Historial de la solicitud' });
    expect(document).toBeVisible();
    expect(history).toBeVisible();
    expect(document.closest('section')?.nextElementSibling).toBe(history);
    expect(screen.getByRole('link', { name: 'Abrir documento en otra pestaña' })).toHaveAttribute('target', '_blank');
    expect(screen.getByText('Panel OCR')).toBeVisible();
    expect(history.closest('.overflow-y-auto')).not.toBeNull();
  });

  it('descarta respuestas tardías al cambiar rápidamente de expediente', async () => {
    let resolveFirst!: (value: unknown) => void;
    (fetchApplicationDetail as jest.Mock)
      .mockReturnValueOnce(new Promise(resolve => { resolveFirst = resolve; }))
      .mockResolvedValueOnce({ ok: true, data: { id: 'second', status: 'PENDIENTE', firstName: 'Bea' } });
    const { rerender } = render(<ApplicationDrawer open applicationId="first" onClose={jest.fn()} />);
    rerender(<ApplicationDrawer open applicationId="second" onClose={jest.fn()} />);
    expect(await screen.findByText('Historial second')).toBeVisible();
    await act(async () => resolveFirst({ ok: true, data: { id: 'first', status: 'PENDIENTE', firstName: 'Ana' } }));
    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
    expect(screen.queryByText('Historial first')).not.toBeInTheDocument();
    expect(screen.getByText('Historial second')).toBeVisible();
    expect(fetchDocumentUrl).toHaveBeenCalledTimes(1);
  });
});
