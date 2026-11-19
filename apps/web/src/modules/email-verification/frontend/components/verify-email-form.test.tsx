import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VerifyEmailForm } from './verify-email-form';
import { useEmailVerificationStore } from '../store/email-verification.store';
import { emailVerificationService } from '../services/email-verification.service';
import { checkRegistrationSession } from '@/modules/registration/frontend/services/registration.service';
import { useRegistrationStore } from '@/modules/registration/frontend/store';

jest.mock('@/modules/registration/frontend/services/registration.service', () => ({
  ...jest.requireActual('@/modules/registration/frontend/services/registration.service'),
  checkRegistrationSession: jest.fn(),
}));

jest.mock('../services/email-verification.service', () => ({
  ...jest.requireActual('../services/email-verification.service'),
  emailVerificationService: {
    verifyOtp: jest.fn(),
    resendOtp: jest.fn(),
  },
}));

const mockedCheckRegistrationSession = checkRegistrationSession as jest.Mock;
const mockedResendOtp = emailVerificationService.resendOtp as jest.Mock;

describe('VerifyEmailForm Component', () => {
  beforeEach(() => {
    useEmailVerificationStore.getState().reset();
    useRegistrationStore.getState().reset();
    jest.clearAllMocks();
    mockedCheckRegistrationSession.mockResolvedValue({ status: 'unknown' });
  });

  it('debe renderizar el título de verificación y correo enmascarado', () => {
    render(<VerifyEmailForm initialEmail="usuario.prueba@umss.edu" />);

    expect(screen.getByText('Verifica tu correo electrónico')).toBeInTheDocument();
    expect(screen.getByText('us****a@umss.edu')).toBeInTheDocument();
  });

  it('debe mantener deshabilitado el botón hasta completar los 6 dígitos', () => {
    render(<VerifyEmailForm />);

    const submitBtn = screen.getByRole('button', { name: /^verificar correo$/i });
    expect(submitBtn).toBeDisabled();

    // Llenamos solo 3 casillas
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: '1' } });
    fireEvent.change(inputs[1], { target: { value: '2' } });
    fireEvent.change(inputs[2], { target: { value: '3' } });

    expect(submitBtn).toBeDisabled();

    // Completamos las 3 restantes
    fireEvent.change(inputs[3], { target: { value: '4' } });
    fireEvent.change(inputs[4], { target: { value: '5' } });
    fireEvent.change(inputs[5], { target: { value: '6' } });

    expect(submitBtn).not.toBeDisabled();
  });

  it('debe llamar a onEditData al presionar Corregir mis datos', () => {
    const onEditDataMock = jest.fn();
    render(<VerifyEmailForm onEditData={onEditDataMock} />);

    const editBtn = screen.getByRole('button', { name: /corregir mis datos/i });
    fireEvent.click(editBtn);

    expect(onEditDataMock).toHaveBeenCalledTimes(1);
  });

  it('muestra la variante de actualización de correo y regresa al resumen (CA-07.4)', () => {
    const onBackToReview = jest.fn();
    render(
      <VerifyEmailForm
        variant="update"
        initialEmail="nuevo.correo@umss.edu"
        onBackToReview={onBackToReview}
      />,
    );

    expect(screen.getByText('Verifica tu nuevo correo electrónico')).toBeInTheDocument();
    expect(screen.getByText('Tus datos previos permanecen intactos')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /corregir mis datos/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /volver al resumen de revisión/i }));
    expect(onBackToReview).toHaveBeenCalledTimes(1);
  });

  it('restaura la expiración y el cooldown reales del OTP al recargar', async () => {
    useRegistrationStore.getState().setSessionToken('registration-session');
    mockedCheckRegistrationSession.mockResolvedValue({
      status: 'active',
      expiresInSeconds: 7000,
      hasVerificationCode: true,
      codeExpiresInSeconds: 127,
      resendAvailableInSeconds: 31,
    });

    render(<VerifyEmailForm />);

    expect(await screen.findByText('02:07')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /disponible en 31s/i }),
    ).toBeDisabled();
    expect(mockedResendOtp).not.toHaveBeenCalled();
  });

  it('solicita un código solo cuando el servidor confirma que aún no se emitió uno', async () => {
    useRegistrationStore.getState().setSessionToken('registration-session');
    mockedCheckRegistrationSession.mockResolvedValue({
      status: 'active',
      expiresInSeconds: 7000,
      hasVerificationCode: false,
      codeExpiresInSeconds: 0,
      resendAvailableInSeconds: 0,
    });
    mockedResendOtp.mockResolvedValue({
      success: true,
      expiresInSeconds: 300,
      cooldownSeconds: 60,
    });

    render(<VerifyEmailForm />);

    expect(await screen.findByText('05:00')).toBeInTheDocument();
    expect(mockedResendOtp).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: /disponible en 60s/i }),
    ).toBeDisabled();
  });
});
