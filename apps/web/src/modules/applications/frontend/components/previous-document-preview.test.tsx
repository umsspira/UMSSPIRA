
import { act, fireEvent, render, screen } from "@testing-library/react";
import { PreviousDocumentPreview } from "./previous-document-preview";
import { getPreviousDocument } from "../services/application.service";

jest.mock("../services/application.service", () => ({
  getPreviousDocument: jest.fn(),
}));

const mockGetPreviousDocument = jest.mocked(getPreviousDocument);
const TOKEN = "token-de-prueba";

beforeAll(() => {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: jest.fn(() => "blob:documento-previo"),
  });

  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: jest.fn(),
  });
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("BUG-14: vista previa del documento anterior", () => {
  it("habilita el botón cuando existe un documento", () => {
    render(
      <PreviousDocumentPreview token={TOKEN} available={true} />,
    );

    expect(
      screen.getByRole("button", { name: "Ver documento previo" }),
    ).toBeEnabled();
  });

  it("deshabilita el botón cuando no hay documento", () => {
    render(
      <PreviousDocumentPreview token={TOKEN} available={false} />,
    );

    expect(
      screen.getByRole("button", { name: "Ver documento previo" }),
    ).toBeDisabled();

    expect(mockGetPreviousDocument).not.toHaveBeenCalled();
  });

  it("muestra la carga y abre una imagen", async () => {
    let resolver!: (
      result: Awaited<ReturnType<typeof getPreviousDocument>>
    ) => void;

    const pending = new Promise<
      Awaited<ReturnType<typeof getPreviousDocument>>
    >((resolve) => {
      resolver = resolve;
    });

    mockGetPreviousDocument.mockReturnValue(pending);

    render(
      <PreviousDocumentPreview token={TOKEN} available={true} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Ver documento previo" }),
    );

    expect(
      screen.getByRole("button", { name: "Cargando documento..." }),
    ).toBeDisabled();

    expect(mockGetPreviousDocument).toHaveBeenCalledWith(TOKEN);

    await act(async () => {
      resolver({
        status: "success",
        file: new Blob(["imagen"], { type: "image/png" }),
      });
    });

    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    expect(
      screen.getByRole("img", {
        name: "Vista previa del documento de respaldo anterior",
      }),
    ).toHaveAttribute("src", "blob:documento-previo");
  });

  it("abre un PDF en un iframe", async () => {
    mockGetPreviousDocument.mockResolvedValue({
      status: "success",
      file: new Blob(["%PDF-1.4"], {
        type: "application/pdf",
      }),
    });

    render(
      <PreviousDocumentPreview token={TOKEN} available={true} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Ver documento previo" }),
    );

    expect(
      await screen.findByTitle("Vista previa del documento PDF anterior"),
    ).toHaveAttribute("src", "blob:documento-previo");
  });

  it("cierra el diálogo con el botón Cerrar", async () => {
    mockGetPreviousDocument.mockResolvedValue({
      status: "success",
      file: new Blob(["imagen"], { type: "image/png" }),
    });

    render(
      <PreviousDocumentPreview token={TOKEN} available={true} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Ver documento previo" }),
    );

    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(
      "blob:documento-previo",
    );
  });

  it("cierra el diálogo al presionar Escape", async () => {
    mockGetPreviousDocument.mockResolvedValue({
      status: "success",
      file: new Blob(["imagen"], { type: "image/jpeg" }),
    });

    render(
      <PreviousDocumentPreview token={TOKEN} available={true} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Ver documento previo" }),
    );

    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("muestra un error cuando el enlace es inválido", async () => {
    mockGetPreviousDocument.mockResolvedValue({
      status: "invalid-link",
    });

    render(
      <PreviousDocumentPreview token={TOKEN} available={true} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Ver documento previo" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El enlace de corrección ya no es válido",
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("muestra el error recibido del servicio", async () => {
    mockGetPreviousDocument.mockResolvedValue({
      status: "error",
      message: "No se pudo obtener el documento anterior.",
    });

    render(
      <PreviousDocumentPreview token={TOKEN} available={true} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Ver documento previo" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo obtener el documento anterior.",
    );
  });
});
