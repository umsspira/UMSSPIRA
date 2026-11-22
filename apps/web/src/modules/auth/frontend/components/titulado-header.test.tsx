import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { TituladoHeader } from "./titulado-header";

const mockApiClient = jest.fn();
let mockPathname = "/profile";

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

jest.mock("./logout-button", () => ({
  LogoutButton: () => <button type="button">Cerrar sesión</button>,
}));

jest.mock("@/shared/services/api-client", () => ({
  apiClient: (...args: unknown[]) => mockApiClient(...args),
}));

describe("TituladoHeader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiClient.mockResolvedValue({ data: [] });
    mockPathname = "/profile";
  });

  it("lleva al perfil profesional del titulado (Épica 2)", () => {
    render(<TituladoHeader />);

    expect(screen.getByRole("link", { name: "Mi perfil profesional" })).toHaveAttribute("href", "/profile");
  });

  it("muestra el acceso a Mis postulaciones y marca la ruta activa", () => {
    mockPathname = "/my-applications";
    render(<TituladoHeader />);

    expect(screen.getByRole("link", { name: "Mis postulaciones" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Mis postulaciones" })).toHaveAttribute(
      "href",
      "/my-applications",
    );
  });

  it("sigue sin mostrar ningún enlace administrativo y conserva cerrar sesión", () => {
    render(<TituladoHeader />);

    expect(screen.queryByRole("link", { name: /solicitudes/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument();
  });

  it("muestra la campanita con los avisos persistentes del titulado", async () => {
    mockApiClient.mockResolvedValueOnce({
      data: [{
        id: "notification-1",
        title: "Evento actualizado",
        description: "Se cambió el horario.",
        href: "/portal/eventos/event-1",
        unread: true,
        createdAt: "2026-11-17T22:00:00.000Z",
      }],
    });
    render(<TituladoHeader />);

    await waitFor(() => expect(mockApiClient).toHaveBeenCalledWith(
      "/api/v1/event-notifications",
      { authenticated: true },
    ));
    fireEvent.click(screen.getByRole("button", { name: "Notificaciones" }));

    expect(await screen.findByText("Evento actualizado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Marcar como leída" })).toBeInTheDocument();
  });

  it("muestra una tarjeta temporal al llegar un aviso nuevo", async () => {
    mockApiClient
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({
        data: [{
          id: "notification-2",
          title: "Recordatorio: Encuentro de titulados",
          description: "El evento empieza pronto.",
          href: "/portal/eventos/event-1?fromReminder=1",
          unread: true,
          createdAt: "2026-11-17T22:00:00.000Z",
        }],
      });
    render(<TituladoHeader />);

    await waitFor(() => expect(mockApiClient).toHaveBeenCalledTimes(1));
    fireEvent.focus(window);

    expect(await screen.findByText("Recordatorio: Encuentro de titulados")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("sin foto guardada no agrega ningún avatar", () => {
    render(<TituladoHeader />);

    expect(screen.queryByTestId("profile-photo-badge")).not.toBeInTheDocument();
  });

  it("marca Mentorías con subrayado naranja dentro del módulo", () => {
    mockPathname = "/mentorship/directory";
    render(<TituladoHeader />);

    const link = screen.getByRole("link", { name: "Mentorías" });
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link.querySelector("[data-active-indicator]")).not.toBeNull();
  });

  it("no marca Mentorías fuera del módulo", () => {
    mockPathname = "/profile";
    render(<TituladoHeader />);

    const link = screen.getByRole("link", { name: "Mentorías" });
    expect(link).not.toHaveAttribute("aria-current", "page");
    expect(link.querySelector("[data-active-indicator]")).toBeNull();
  });
});
