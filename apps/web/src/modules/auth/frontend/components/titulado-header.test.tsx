import { render, screen } from "@testing-library/react";

import { TituladoHeader } from "./titulado-header";

let mockPathname = "/profile";

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

jest.mock("./logout-button", () => ({
  LogoutButton: () => <button type="button">Cerrar sesión</button>,
}));

describe("TituladoHeader", () => {
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
