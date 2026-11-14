import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ObserveDialog } from './observe-dialog';
import { useReview } from '../hooks/use-review';

jest.mock('../hooks/use-review', () => {
  const actual = jest.requireActual<typeof import('../hooks/use-review')>('../hooks/use-review');
  return { ...actual, useReview: jest.fn() };
});

const NOTE = 'El documento presentado no se puede leer.';
const submitReview = jest.fn();
const onClose = jest.fn();

function renderDialog() {
  return render(
    <ObserveDialog
      open
      applicationId="id"
      expedienteCode="TIT-1"
      applicantName="Ana"
      onClose={onClose}
    />,
  );
}

describe('ObserveDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    submitReview.mockResolvedValue(true);
    (useReview as jest.Mock).mockReturnValue({ submitReview, isLoading: false, error: null });
  });

  it('no muestra nada cuando está cerrado', () => {
    render(
      <ObserveDialog open={false} applicationId="id" expedienteCode="TIT-1" applicantName="Ana" onClose={onClose} />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('muestra los dos errores cuando faltan los motivos y la explicación', () => {
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Observación' }));

    expect(screen.getByText('Selecciona al menos un motivo de observación.')).toBeInTheDocument();
    expect(screen.getByText('Este campo es obligatorio.')).toBeInTheDocument();
    expect(submitReview).not.toHaveBeenCalled();
  });

  it('exige la explicación aunque haya motivos seleccionados', () => {
    renderDialog();

    fireEvent.click(screen.getByLabelText('Documento ilegible o borroso'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Observación' }));

    expect(screen.getByText('Este campo es obligatorio.')).toBeInTheDocument();
    expect(submitReview).not.toHaveBeenCalled();
  });

  it('exige los motivos aunque haya una explicación válida', () => {
    renderDialog();

    fireEvent.change(screen.getByLabelText(/Qué debe corregir el Titulado/), { target: { value: NOTE } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Observación' }));

    expect(screen.getByText('Selecciona al menos un motivo de observación.')).toBeInTheDocument();
    expect(submitReview).not.toHaveBeenCalled();
  });

  it('envía varios motivos y una sola explicación en el orden de la lista', async () => {
    renderDialog();

    fireEvent.click(screen.getByLabelText('Datos declarados no coinciden con el respaldo'));
    fireEvent.click(screen.getByLabelText('Documento ilegible o borroso'));
    fireEvent.change(screen.getByLabelText(/Qué debe corregir el Titulado/), { target: { value: NOTE } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Observación' }));

    await waitFor(() =>
      expect(submitReview).toHaveBeenCalledWith({
        decision: 'OBSERVADA',
        motivos: ['documento_ilegible', 'datos_no_coinciden'],
        note: NOTE,
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
