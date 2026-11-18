import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { FindingsTable, type OcrFinding } from "./findings-table";

const findings = [
  {
    field: "career",
    label: "Carrera",
    declared: "Ingeniería de Sistemas",
    read: "Ingeniería de Sistemas",
    status: "COINCIDE",
    reason: "Los datos coinciden.",
    evidence: { page: 1, text: "Carrera: Ingeniería de Sistemas" },
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
] as unknown as OcrFinding[];

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
    expect(screen.getByText("No se pudo comprobar")).toBeInTheDocument();
  });

  it("indica si el hallazgo tiene evidencia", () => {
    render(
      <FindingsTable
        findings={findings}
        selectedField={null}
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByText("Evidencia · pág. 1")).toBeInTheDocument();
    expect(screen.getByText("Sin evidencia")).toBeInTheDocument();
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