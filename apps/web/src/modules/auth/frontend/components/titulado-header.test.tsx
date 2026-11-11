import { render, screen } from "@testing-library/react";

import { useProfilePhotoStore } from "@/shared/hooks/use-profile-photo-store";

import { TituladoHeader } from "./titulado-header";

jest.mock("./logout-button", () => ({
  LogoutButton: () => <button type="button">Cerrar sesión</button>,
}));

jest.mock("@/shared/services/profile-photo-service", () => ({
  loadProfilePhoto: jest.fn().mockResolvedValue(null),
  saveProfilePhoto: jest.fn(),
}));

describe("TituladoHeader", () => {
  beforeEach(() => {
    useProfilePhotoStore.setState({ photoUrl: null, status: "ready" });
  });

  it("lleva al perfil profesional del titulado (Épica 2)", () => {
    render(<TituladoHeader />);

    expect(screen.getByRole("link", { name: "Mi perfil profesional" })).toHaveAttribute("href", "/profile");
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

  it("con foto guardada la muestra en el encabezado", () => {
    useProfilePhotoStore.setState({ photoUrl: "blob:foto", status: "ready" });
    render(<TituladoHeader />);

    expect(screen.getByTestId("profile-photo-badge").querySelector("img")).toHaveAttribute("src", "blob:foto");
  });
});