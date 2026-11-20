import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { FindingsTable, type OcrFinding } from "./findings-table";

const findings: OcrFinding[] = [
  {
    field: "career",
    label: "Carrera",
    declared: "Ingeniería de Sistemas",
    read: "Ingeniería de Sistemas",
    status: "COINCIDE",
    reason: "Los datos coinciden.",
    evidence: { page: 1, text: "Carrera: Ingeniería de Sistemas", confidence: 0.99 },
  },
  {
    field: "graduationYear",
    label: "Año de egreso",
    declared: "2024",
    read: "",
    status: "NO_COMPROBADO",
    reason: "No se pudo leer el dato.",
    evidence: null,
  },
];

describe("FindingsTable", () => {
  it("muestra el dato declarado, el leído y el resultado de cada hallazgo", () => {
    render(
      <FindingsTable
        findings={findings}
        selectedField={null}
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByText("Carrera")).toBeInTheDocument();
    expect(screen.getByText("Coincide")).toBeInTheDocument();
    expect(screen.getByText("2024")).toBeInTheDocument();
    expect(screen.getByText("No legible")).toBeInTheDocument();
    expect(screen.getByText("No comprobable")).toBeInTheDocument();
  });

  it("mantiene etiquetas breves sin repetir motivos ni evidencia en cada fila", () => {
    render(
      <FindingsTable
        findings={findings}
        selectedField={null}
        onSelect={jest.fn()}
      />,
    );
    expect(screen.queryByText("Los datos coinciden.")).not.toBeInTheDocument();
    expect(screen.queryByText("Evidencia · pág. 1")).not.toBeInTheDocument();
    expect(screen.getByText('Coincide')).toHaveAttribute('title', 'Los datos coinciden.');
  });

  it("avisa qué campo se selecciona", () => {
    const onSelect = jest.fn();
    render(
      <FindingsTable
        findings={findings}
        selectedField={null}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Año de egreso" }));
    expect(onSelect).toHaveBeenCalledWith("graduationYear");
  });

  it("marca como presionado solo el hallazgo seleccionado", () => {
    render(
      <FindingsTable
        findings={findings}
        selectedField="career"
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Carrera" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "Año de egreso" }),
    ).toHaveAttribute("aria-pressed", "false");
  });
});
