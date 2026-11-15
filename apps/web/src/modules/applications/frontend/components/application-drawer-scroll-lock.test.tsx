import { render, screen } from '@testing-library/react';
import { ApplicationDrawer } from './application-drawer';
import { fetchApplicationDetail, fetchDocumentUrl } from '../services/applications-board.service';

jest.mock('../services/applications-board.service', () => ({
  fetchApplicationDetail: jest.fn(), fetchDocumentUrl: jest.fn(),
}));
jest.mock('./application-detail', () => ({
  ApplicationDetail: () => <p>Documento del expediente</p>,
  OVERDUE_HOURS: 48, hoursSince: () => 0, STATUS_LABEL: { PENDIENTE: 'Pendiente' },
}));
jest.mock('./observe-dialog', () => ({ ObserveDialog: () => null }));
jest.mock('./approve-dialog', () => ({ ApproveDialog: () => null }));
jest.mock('./reject-dialog', () => ({ RejectDialog: () => null }));

describe('BUG-07 bloqueo del fondo con el expediente abierto', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.style.overflow = '';
    (fetchDocumentUrl as jest.Mock).mockResolvedValue({ ok: true, data: { url: 'https://example.com/file.pdf' } });
    (fetchApplicationDetail as jest.Mock).mockResolvedValue({ ok: true, data: {
      id: 'id', status: 'PENDIENTE', firstName: 'Ana', lastName: 'Perez',
      reviewSummary: { observations: 0, maxObservations: 2, rejections: 0, maxRejections: 5,
        latestObservation: null, canObserve: true },
    } });
  });

  it('bloquea el desplazamiento del fondo y lo restaura al cerrar', async () => {
    const { rerender } = render(<ApplicationDrawer open applicationId="id" onClose={jest.fn()} />);
    await screen.findByRole('button', { name: 'Aprobar' });
    expect(document.body.style.overflow).toBe('hidden');

    rerender(<ApplicationDrawer open={false} applicationId="id" onClose={jest.fn()} />);
    expect(document.body.style.overflow).toBe('');
  });

  it('mueve el foco al expediente y lo devuelve al control de origen al cerrar', async () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    const { rerender } = render(<ApplicationDrawer open applicationId="id" onClose={jest.fn()} />);
    await screen.findByRole('button', { name: 'Aprobar' });
    expect(screen.getByRole('dialog')).toHaveFocus();

    rerender(<ApplicationDrawer open={false} applicationId="id" onClose={jest.fn()} />);
    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});
