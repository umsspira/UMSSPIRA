import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfirmationContent } from './confirmation-content';
import { downloadReceiptPdf } from '../lib/receipt-pdf';
import { useRegistrationStore } from '@/modules/registration/frontend/store';

jest.mock('../lib/receipt-pdf', () => ({
  downloadReceiptPdf: jest.fn().mockResolvedValue(undefined),
}));

const CONFIRMATION = {
  estado: 'PENDING',
  fechaEnvio: '2026-10-24T10:45:00.000Z',
  nombreCompleto: 'Juan Carlos Pérez Mamani',
  ci: '6842109 CB',
  correoEnmascarado: 'ju****z@example.com',
  correo: 'juan.perez@example.com',
  plazoHoras: 48,
  tipoDocumento: 'titulo_provision_nacional' as const,
  nombreArchivo: 'titulo_academico.pdf',
};

describe('ConfirmationContent', () => {
  beforeEach(() => {
    localStorage.clear();
    useRegistrationStore.getState().reset();
    jest.clearAllMocks();
  });

  it('muestra los datos de la solicitud entregada sin el código interno TIT (CA-07.6)', async () => {
    useRegistrationStore.getState().setConfirmation(CONFIRMATION);
    render(<ConfirmationContent />);

    expect(await screen.findByText('¡Solicitud enviada con éxito!')).toBeInTheDocument();
    expect(screen.getByText('Juan Carlos Pérez Mamani')).toBeInTheDocument();
    expect(screen.getByText('6842109 CB')).toBeInTheDocument();
    expect(screen.getByText('ju****z@example.com')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.queryByText('Código de trámite')).not.toBeInTheDocument();
    expect(screen.queryByText('N/A')).not.toBeInTheDocument();
  });

  it('avisa cuando no hay una entrega reciente en el navegador', async () => {
    render(<ConfirmationContent />);

    expect(await screen.findByText('No encontramos una solicitud reciente')).toBeInTheDocument();
  });

  it('descarga la constancia en PDF sin abrir el diálogo de impresión', async () => {
    const printSpy = jest.spyOn(window, 'print').mockImplementation(() => undefined);
    useRegistrationStore.getState().setConfirmation(CONFIRMATION);
    render(<ConfirmationContent />);

    fireEvent.click(await screen.findByRole('button', { name: /Guardar constancia en PDF/i }));

    await waitFor(() => expect(downloadReceiptPdf).toHaveBeenCalledTimes(1));
    expect(downloadReceiptPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Juan Carlos Pérez Mamani',
        ci: '6842109 CB',
        documentTypeLabel: 'Título en Provisión Nacional',
        status: 'Pendiente',
      }),
    );
    expect(printSpy).not.toHaveBeenCalled();
    printSpy.mockRestore();
  });

  it('muestra un aviso si falla la generación del PDF', async () => {
    (downloadReceiptPdf as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    useRegistrationStore.getState().setConfirmation(CONFIRMATION);
    render(<ConfirmationContent />);

    fireEvent.click(await screen.findByRole('button', { name: /Guardar constancia en PDF/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos generar la constancia');
  });
});