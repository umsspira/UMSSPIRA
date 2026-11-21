import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { EvidenceViewer } from "./evidence-viewer";
import type { OcrFinding } from "./findings-table";

const withEvidence = {
  field: "career",
  label: "Carrera",
  declared: "Ingeniería de Sistemas",
  read: "Ingenieria de Sistemas",
  status: "POSIBLE_DIFERENCIA",
  reason: "Difiere en la tilde.",
  evidence: { page: 2, text: "Carrera: Ingenieria de Sistemas" },
} as unknown as OcrFinding;

const withoutEvidence = {
  ...withEvidence,
  read: "",
  status: "NO_COMPROBADO",
  evidence: null,
} as unknown as OcrFinding;

describe("EvidenceViewer", () => {
  it("pide seleccionar un hallazgo cuando no hay ninguno", () => {
    render(<EvidenceViewer finding={null} documentUrl="" />);
    expect(
      screen.getByText("Selecciona un hallazgo para ver su evidencia."),
    ).toBeInTheDocument();
  });

  it("muestra el dato declarado, el leído y la evidencia junto al hallazgo", () => {
    render(
      <EvidenceViewer
        finding={withEvidence}
        documentUrl="https://files.test/doc.pdf?token=abc"
      />,
    );
    expect(screen.getByText("Ingeniería de Sistemas")).toBeInTheDocument();
    expect(screen.getByText("Ingenieria de Sistemas")).toBeInTheDocument();
    expect(screen.getByText("Evidencia · pág. 2")).toBeInTheDocument();
    expect(
      screen.getByText("Carrera: Ingenieria de Sistemas"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Abrir página del respaldo" }),
    ).toHaveAttribute("href", "https://files.test/doc.pdf?token=abc#page=2");
  });

  it("no muestra el enlace si no hay URL del documento", () => {
    render(<EvidenceViewer finding={withEvidence} documentUrl="" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("explica que no hay evidencia y permite la revisión manual", () => {
    render(<EvidenceViewer finding={withoutEvidence} documentUrl="" />);
    expect(screen.getByText("No legible")).toBeInTheDocument();
    expect(
      screen.getByText(/No hay evidencia disponible para este campo/),
    ).toBeInTheDocument();
  });
});