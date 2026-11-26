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

const renderDetails = (finding: OcrFinding) => finding.reason;

describe("FindingsTable", () => {
  it("muestra el dato declarado, el leído y el resultado de cada hallazgo", () => {
    render(
      <FindingsTable
        findings={findings}
        selectedField={null}
        onSelect={jest.fn()}
        renderDetails={renderDetails}
      />,
    );
    expect(screen.getByText("Carrera")).toBeInTheDocument();
    expect(screen.getByText("Coincide")).toBeInTheDocument();
    expect(screen.getByText("2024")).toBeInTheDocument();
    expect(screen.getByText("Sin lectura")).toBeInTheDocument();
    expect(screen.getByText("No comprobable")).toBeInTheDocument();
  });

  it("oculta los motivos mientras los campos están cerrados", () => {
    render(
      <FindingsTable
        findings={findings}
        selectedField={null}
        onSelect={jest.fn()}
        renderDetails={renderDetails}
      />,
    );
    expect(screen.queryByText("Los datos coinciden.")).not.toBeInTheDocument();
    expect(screen.queryByText("No se pudo leer el dato.")).not.toBeInTheDocument();
  });

  it("avisa qué campo se selecciona", () => {
    const onSelect = jest.fn();
    render(
      <FindingsTable
        findings={findings}
        selectedField={null}
        onSelect={onSelect}
        renderDetails={renderDetails}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Año de egreso" }));
    expect(onSelect).toHaveBeenCalledWith("graduationYear");
  });

  it("despliega el motivo del campo seleccionado y permite cerrarlo", () => {
    const onSelect = jest.fn();
    render(
      <FindingsTable
        findings={findings}
        selectedField="career"
        onSelect={onSelect}
        renderDetails={renderDetails}
      />,
    );
    const button = screen.getByRole("button", { name: "Carrera" });
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("button", { name: "Año de egreso" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Los datos coinciden.")).toBeVisible();
    expect(screen.queryByText("No se pudo leer el dato.")).not.toBeInTheDocument();
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
