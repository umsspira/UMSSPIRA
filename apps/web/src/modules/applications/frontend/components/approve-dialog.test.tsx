import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApproveDialog } from './approve-dialog';
import { useReview } from '../hooks/use-review';

jest.mock('../hooks/use-review', () => ({ useReview: jest.fn() }));

it('muestra el auditor de sesión y el correo enmascarado sin enviar una autoría editable', async () => {
  const submitReview = jest.fn().mockResolvedValue(true);
  (useReview as jest.Mock).mockReturnValue({ submitReview, isLoading: false, error: null });
  const onClose = jest.fn();
  render(<ApproveDialog open applicationId="id" expedienteCode="TIT-1" applicantName="Ana"
    applicantEmail="ana.perez@example.com" currentReviewer={{ name: 'Administradora', email: 'admin@example.com' }}
    onClose={onClose} />);
  expect(screen.getByText('Dictamen registrado por:')).toBeInTheDocument();
  expect(screen.getByText('Administradora')).toBeInTheDocument();
  expect(screen.getByText('an****z@example.com')).toBeInTheDocument();
  expect(screen.queryByText('ana.perez@example.com')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar Aprobación' }));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(submitReview).toHaveBeenCalledWith({ decision: 'APROBADA' });
});

it('usa el correo del auditor cuando su nombre no está disponible', () => {
  (useReview as jest.Mock).mockReturnValue({ submitReview: jest.fn(), isLoading: false, error: null });
  render(<ApproveDialog open applicationId="id" expedienteCode="TIT-1" applicantName="Ana"
    currentReviewer={{ name: null, email: 'admin@example.com' }} onClose={jest.fn()} />);
  expect(screen.getByText('admin@example.com')).toBeInTheDocument();
});
