
import { render, screen } from "@testing-library/react";
import { QualityWarning } from "./quality-warning";
import type { ImageQualityResult } from "../lib/image-quality.types";

describe("QualityWarning - HU-15", () => {
  const result = (
    status: ImageQualityResult["status"],
    warnings: ImageQualityResult["warnings"] = [],
  ): ImageQualityResult => ({
    status,
    warnings,
    metrics: null,
  });

  it("no muestra avisos antes del análisis (CA-15.1)", () => {
    const { container } = render(
      <QualityWarning result={result("idle")} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("muestra el progreso mientras analiza la imagen (CA-15.1)", () => {
    render(<QualityWarning result={result("analyzing")} />);

    expect(
      screen.getByText(/Analizando la calidad de la imagen/i),
    ).toBeInTheDocument();
  });

  it("muestra advertencias y recomendaciones (CA-15.2)", () => {
    render(
      <QualityWarning
        result={result("done", [
          {
            code: "BLURRY",
            message: "La imagen parece borrosa.",
            recommendation: "Vuelve a tomar la foto.",
          },
        ])}
      />,
    );

    expect(
      screen.getByRole("region", {
        name: "Avisos de calidad de imagen",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText("La imagen parece borrosa."),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Vuelve a tomar la foto."),
    ).toBeInTheDocument();
  });

  it("informa cuando no se detectan problemas (CA-15.2)", () => {
    render(<QualityWarning result={result("done")} />);

    expect(
      screen.getByText(/No se detectaron problemas de calidad/i),
    ).toBeInTheDocument();
  });

  it("permite continuar cuando el análisis falla (CA-15.6)", () => {
    render(<QualityWarning result={result("failed")} />);

    expect(
      screen.getByText(/No se pudo comprobar la calidad/i),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/reemplazarla o continuar/i),
    ).toBeInTheDocument();
  });

  it("no muestra avisos para archivos omitidos, como PDF", () => {
    const { container } = render(
      <QualityWarning result={result("skipped")} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("actualiza las advertencias al recibir un nuevo resultado (CA-15.3)", () => {
    const { rerender } = render(
      <QualityWarning
        result={result("done", [
          {
            code: "TOO_DARK",
            message: "La imagen está muy oscura.",
            recommendation: "Busca un lugar con más luz.",
          },
        ])}
      />,
    );

    expect(
      screen.getByText("La imagen está muy oscura."),
    ).toBeInTheDocument();

    rerender(<QualityWarning result={result("analyzing")} />);

    expect(
      screen.queryByText("La imagen está muy oscura."),
    ).not.toBeInTheDocument();

    expect(
      screen.getByText(/Analizando la calidad de la imagen/i),
    ).toBeInTheDocument();
  });
});
