import { render, screen, fireEvent, act } from "@testing-library/react";
import { ForgotPasswordForm } from "./forgot-password-form";
import { requestPasswordRecovery } from "../services/password-recovery.service";

jest.mock("../services/password-recovery.service", () => ({
  requestPasswordRecovery: jest.fn(),
}));

// CORRECCIÓN: Usamos un componente con nombre propio y displayName asignado
jest.mock("next/link", () => {
  const MockLink = ({ children }: { children: React.ReactNode }) => <a>{children}</a>;
  MockLink.displayName = "MockLink";
  return MockLink;
});

describe("ForgotPasswordForm - BUG-18", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("deshabilita el botón de reenvío y muestra el contador al enviar por primera vez", async () => {
    (requestPasswordRecovery as jest.Mock).mockResolvedValueOnce({});
    render(<ForgotPasswordForm />);
    
    fireEvent.change(screen.getByLabelText(/CORREO ELECTRÓNICO/i), {
      target: { value: "test@umss.edu.bo" },
    });
    
    fireEvent.click(screen.getByRole("button", { name: /Enviar enlace/i }));
    
    await act(async () => {
      await Promise.resolve();
    });

    const resendButton = screen.getByRole("button", { name: /Reenviar enlace en 30s/i });
    expect(resendButton).toBeDisabled();
  });

  it("habilita el botón y permite reenviar cuando el contador llega a 0", async () => {
    (requestPasswordRecovery as jest.Mock).mockResolvedValueOnce({});
    render(<ForgotPasswordForm />);
    
    fireEvent.change(screen.getByLabelText(/CORREO ELECTRÓNICO/i), {
      target: { value: "test@umss.edu.bo" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Enviar enlace/i }));
    
    await act(async () => {
      await Promise.resolve();
    });

    // Avanzar el tiempo segundo a segundo
    for (let i = 0; i < 30; i++) {
      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });
    }

    const resendButton = screen.getByRole("button", { name: /^Reenviar enlace$/i });
    expect(resendButton).toBeEnabled();
    
    (requestPasswordRecovery as jest.Mock).mockResolvedValueOnce({});
    fireEvent.click(resendButton);
    
    await act(async () => {
      await Promise.resolve();
    });

    expect(requestPasswordRecovery).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/¡Enlace reenviado con éxito!/i)).toBeInTheDocument();
  });
});