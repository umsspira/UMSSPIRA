import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { ReviewPreviewDialog } from "./review-preview-dialog";

const base = {
  open: true,
  decision: "APROBADA" as const,
  expedienteCode: "EXP-1",
  applicantName: "Ana Pérez",
  recipient: "a***@umss.edu",
  reasonLabels: [],
  cause: "",
  note: "Diferencia menor confirmada",
  suggestionLabel: "Observar",
  version: 2,
  isLoading: false,
  error: null,
  stale: false,
};

function setup(overrides = {}) {
  const handlers = {
    onBack: jest.fn(),
    onCancel: jest.fn(),
    onConfirm: jest.fn(),
    onRefresh: jest.fn(),
  };
  render(<ReviewPreviewDialog {...base} {...handlers} {...overrides} />);
  return handlers;
}

describe("ReviewPreviewDialog", () => {
  it("muestra decisión, destinatario, sugerencia y nota interna", () => {
    setup();
    expect(screen.getByText("Aprobar")).toBeInTheDocument();
    expect(screen.getByText("a***@umss.edu")).toBeInTheDocument();
    expect(screen.getByText("Observar")).toBeInTheDocument();
    expect(screen.getByText("Diferencia menor confirmada")).toBeInTheDocument();
  });

  it("la declaración entra sin marcar y bloquea la confirmación", () => {
    const { onConfirm } = setup();
    const confirm = screen.getByRole("button", { name: "Confirmar dictamen y notificar" });
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(confirm).toBeDisabled();
    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirma solo después de marcar la declaración", () => {
    const { onConfirm } = setup();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar dictamen y notificar" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("Volver a editar y Cancelar no confirman", () => {
    const { onBack, onCancel, onConfirm } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Volver a editar" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("con vista desactualizada pide actualizar y bloquea la confirmación", () => {
    const { onRefresh } = setup({ stale: true, error: "La solicitud cambió; actualiza el expediente." });
    expect(screen.getByRole("alert")).toHaveTextContent("La solicitud cambió");
    expect(screen.getByRole("button", { name: "Confirmar dictamen y notificar" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Actualizar expediente" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("no se muestra cuando está cerrado", () => {
    setup({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});