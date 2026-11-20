import { render, screen } from "@testing-library/react";
import type { OcrFinding } from "@umsspira/shared-types";
import { OcrCompatibility } from "./ocr-compatibility";

function findings(statuses: OcrFinding["status"][]): OcrFinding[] {
  return statuses.map((status, index) => ({
    field: `field-${index}`,
    label: "Campo",
    declared: "Dato declarado",
    read: null,
    status,
    reason: "Evidencia",
    evidence: null,
  }));
}

describe("Compatibilidad documental informativa", () => {
  it.each([
    { statuses: ["COINCIDE", "COINCIDE"], percentage: 100 },
    { statuses: ["POSIBLE_DIFERENCIA", "POSIBLE_DIFERENCIA"], percentage: 0 },
    { statuses: ["COINCIDE", "NO_COMPROBADO"], percentage: 50 },
    {
      statuses: [
        "COINCIDE",
        "COINCIDE",
        "COINCIDE",
        "COINCIDE",
        "POSIBLE_DIFERENCIA",
        "NO_COMPROBADO",
      ],
      percentage: 67,
    },
  ] satisfies { statuses: OcrFinding["status"][]; percentage: number }[])(
    "muestra $percentage % sin excluir campos que no se pudieron comprobar",
    ({ statuses, percentage }) => {
      render(<OcrCompatibility findings={findings(statuses)} />);
      expect(screen.getByText(`${percentage}%`)).toBeVisible();
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        `${percentage}`,
      );
    },
  );

  it.each([
    { statuses: [] },
    { statuses: ["NO_COMPROBADO", "NO_COMPROBADO"] },
  ] satisfies { statuses: OcrFinding["status"][] }[])(
    "no inventa un porcentaje si no hay datos comprobables: $statuses",
    ({ statuses }) => {
      render(<OcrCompatibility findings={findings(statuses)} />);
      expect(screen.getByText("Sin datos suficientes")).toBeVisible();
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    },
  );

  it("explica cobertura y conserva el aviso de lectura parcial aunque todos los campos coincidan", () => {
    render(
      <OcrCompatibility
        findings={findings(["COINCIDE", "COINCIDE"])}
        partial
      />,
    );
    expect(
      screen.getByText(/2 de 2 campos coinciden.*Lectura parcial/),
    ).toBeVisible();
    expect(screen.getByText(/no reemplaza el dictamen/)).toBeVisible();
  });
});
