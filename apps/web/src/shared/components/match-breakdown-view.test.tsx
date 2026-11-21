import { render, screen } from "@testing-library/react";
import type { Applicant } from "../types/applicant";
import { MatchBreakdownView } from "./match-breakdown-view";

const applicant: Applicant = {
  id: "44800000-0000-4000-8000-000000000001",
  name: "Ana Rojas",
  email: "ana.rojas@example.test",
  status: "En revisión",
  appliedAt: "2026-11-02T00:00:00.000Z",
  hasCv: false,
  cvUrl: null,
  matchPercentage: 75,
  matchStatus: "ready",
  matchCalculatedAt: "2026-11-20T12:00:00.000Z",
  comparison: [
    { requirement: "TypeScript", matchedSkill: "TypeScript", result: "exact" },
    { requirement: "Docker", matchedSkill: null, result: "not-found" },
  ],
  matchError: null,
};

describe("MatchBreakdownView (HU-15)", () => {
  it("muestra la comparación real por requisito, el porcentaje y la fecha recibida", () => {
    render(<MatchBreakdownView applicant={applicant} />);

    expect(screen.getAllByText("75%")).toHaveLength(3);
    expect(screen.getAllByText("TypeScript")).toHaveLength(2);
    expect(screen.getByText("Docker")).toBeInTheDocument();
    expect(screen.getByText("No encontrada")).toBeInTheDocument();
    expect(screen.getByText(/Calculado:/)).toBeInTheDocument();
  });

  it("muestra el error individual del motor cuando no hay resultado", () => {
    render(
      <MatchBreakdownView
        applicant={{
          ...applicant,
          matchPercentage: null,
          matchStatus: null,
          matchCalculatedAt: null,
          comparison: [],
          matchError: "No se pudo calcular la afinidad",
        }}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo calcular la afinidad");
    expect(screen.getAllByText("No disponible").length).toBeGreaterThan(0);
  });

  it("distingue una postulación sin perfil suficiente de una vacante sin requisitos", () => {
    render(
      <MatchBreakdownView
        applicant={{
          ...applicant,
          matchPercentage: null,
          matchStatus: "profile-incomplete",
          matchCalculatedAt: null,
          comparison: [],
        }}
      />,
    );

    expect(screen.getByText("No hay suficientes datos del perfil para calcular la comparación."))
      .toBeInTheDocument();
  });
});
