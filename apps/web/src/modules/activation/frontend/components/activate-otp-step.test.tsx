/// <reference types="jest" />

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ActivateOtpStep } from './activate-otp-step';
import { activationService } from '../services/activation.service';

jest.mock('../services/activation.service', () => ({
  activationService: {
    verifyOtp: jest.fn(),
    resendOtp: jest.fn(),
  },
}));

describe('ActivateOtpStep', () => {
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renderiza el mensaje de aprobación, el correo enmascarado y las 6 casillas OTP (CA-06.2)', () => {
    render(
      <ActivateOtpStep
        applicationId="app-123"
        email="titulado.sistemas@umss.edu.bo"
        onSuccess={mockOnSuccess}
      />,
    );

    expect(screen.getByText(/¡solicitud aprobada!/i)).toBeTruthy();
    expect(screen.getByText(/activa tu cuenta de titulado/i)).toBeTruthy();
    expect(screen.getByText(/ti\*\*\*\*s@umss\.edu\.bo/i)).toBeTruthy();

    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(6);

    const nextBtn = screen.getByRole('button', { name: /^siguiente/i });
    expect(nextBtn).toBeDisabled();

    const resendBtn = screen.getByRole('button', { name: /^reenviar código/i });
    expect(resendBtn).not.toBeDisabled();
  });

  it('habilita el botón «Siguiente» solo cuando las seis casillas están llenas (CA-06.2)', () => {
    render(
      <ActivateOtpStep
        applicationId="app-123"
        email="test@umss.edu.bo"
        onSuccess={mockOnSuccess}
      />,
    );

    const inputs = screen.getAllByRole('textbox');
    const nextBtn = screen.getByRole('button', { name: /^siguiente/i });

    // Ingresar 5 dígitos
    for (let i = 0; i < 5; i++) {
      fireEvent.change(inputs[i], { target: { value: `${i + 1}` } });
    }
    expect(nextBtn).toBeDisabled();

    // Ingresar el 6to dígito
    fireEvent.change(inputs[5], { target: { value: '6' } });
    expect(nextBtn).not.toBeDisabled();
  });

  it('muestra mensaje de error cuando el código ingresado es incorrecto (CA-06.4)', async () => {
    (activationService.verifyOtp as jest.Mock).mockRejectedValueOnce(new Error('Código incorrecto'));

    render(
      <ActivateOtpStep
        applicationId="app-123"
        email="test@umss.edu.bo"
        onSuccess={mockOnSuccess}
      />,
    );

    const inputs = screen.getAllByRole('textbox');
    '123456'.split('').forEach((digit, i) => {
      fireEvent.change(inputs[i], { target: { value: digit } });
    });

    const nextBtn = screen.getByRole('button', { name: /^siguiente/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
      expect(screen.getByText(/código incorrecto/i)).toBeTruthy();
    });
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('invalida el OTP tras 5 intentos fallidos (CA-06.4)', async () => {
    (activationService.verifyOtp as jest.Mock).mockRejectedValue(new Error('Código incorrecto'));

    render(
      <ActivateOtpStep
        applicationId="app-123"
        email="test@umss.edu.bo"
        onSuccess={mockOnSuccess}
      />,
    );

    const inputs = screen.getAllByRole('textbox');
    const fillCode = () => {
      '123456'.split('').forEach((digit, i) => {
        fireEvent.change(inputs[i], { target: { value: digit } });
      });
    };

    const nextBtn = screen.getByRole('button', { name: /^siguiente/i });

    // Simular 5 intentos fallidos
    for (let attempt = 1; attempt <= 5; attempt++) {
      fillCode();
      fireEvent.click(nextBtn);
      await waitFor(() => {
        expect(activationService.verifyOtp).toHaveBeenCalledTimes(attempt);
      });
    }

    await waitFor(() => {
      expect(
        screen.getByText(/has superado los 5 intentos permitidos\. el código ha sido invalidado/i),
      ).toBeTruthy();
    });

    // Casillas deshabilitadas tras invalidación
    expect(inputs[0]).toBeDisabled();
  });

  it('ejecuta reenvío al pulsar «Reenviar código» (CA-06.5)', async () => {
    (activationService.resendOtp as jest.Mock).mockResolvedValueOnce({
      message: 'Código reenviado con éxito',
    });

    render(
      <ActivateOtpStep
        applicationId="app-123"
        email="test@umss.edu.bo"
        onSuccess={mockOnSuccess}
      />,
    );

    const resendBtn = screen.getByRole('button', { name: /^reenviar código/i });
    fireEvent.click(resendBtn);

    await waitFor(() => {
      expect(activationService.resendOtp).toHaveBeenCalledWith('app-123');
      expect(screen.getByText(/se ha enviado un nuevo código a tu correo/i)).toBeTruthy();
    });
  });

  it('aplica bloqueo gris y cuenta regresiva de 15 minutos tras 5 reenvíos (CA-06.5)', async () => {
    (activationService.resendOtp as jest.Mock).mockResolvedValue({
      message: 'Código reenviado',
    });

    render(
      <ActivateOtpStep
        applicationId="app-123"
        email="test@umss.edu.bo"
        onSuccess={mockOnSuccess}
      />,
    );

    // 5 reenvíos consecutivos
    for (let i = 1; i <= 5; i++) {
      const btn = screen.getByRole('button', { name: /reenviar código/i });
      fireEvent.click(btn);
      await waitFor(() => {
        expect(activationService.resendOtp).toHaveBeenCalledTimes(i);
      });
    }

    // Al llegar al 5to reenvío, el botón debe quedar deshabilitado y mostrar la cuenta regresiva
    await waitFor(() => {
      const lockedBtn = screen.getByRole('button', { name: /reenviar código en/i });
      expect(lockedBtn).toBeDisabled();
      expect(lockedBtn.textContent).toMatch(/15:00|14:59/);
    });
  });

  it('llama a onSuccess tras verificación exitosa del código (CA-06.2)', async () => {
    (activationService.verifyOtp as jest.Mock).mockResolvedValueOnce({
      activationToken: 'signed-token-xyz',
    });

    render(
      <ActivateOtpStep
        applicationId="app-123"
        email="test@umss.edu.bo"
        onSuccess={mockOnSuccess}
      />,
    );

    const inputs = screen.getAllByRole('textbox');
    '987654'.split('').forEach((digit, i) => {
      fireEvent.change(inputs[i], { target: { value: digit } });
    });

    const nextBtn = screen.getByRole('button', { name: /^siguiente/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(activationService.verifyOtp).toHaveBeenCalledWith('app-123', '987654');
      expect(mockOnSuccess).toHaveBeenCalledWith('signed-token-xyz');
    });
  });
});
