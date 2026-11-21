import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DocumentUploadStep } from "./document-upload-step";
import { useRegistrationStore } from "@/modules/registration/frontend/store";
import { analyzeImageFile } from "../lib/image-quality";
import type { ImageQualityResult } from "../lib/image-quality.types";

const mockPush = jest.fn();

jest.mock("@/modules/registration/frontend/components/review-document-preview", () => ({
  ReviewDocumentPreview: () => <div>Documento guardado</div>,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("../services", () => ({
  ...jest.requireActual("../services"),
  uploadDocument: jest.fn(),
}));

jest.mock("../lib/image-quality", () => ({
  ...jest.requireActual("../lib/image-quality"),
  analyzeImageFile: jest.fn(),
}));

const mockedAnalyze = analyzeImageFile as jest.MockedFunction<typeof analyzeImageFile>;

const FILE_SIGNATURES: Record<string, number[]> = {
  "application/pdf": [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34],
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "image/jpeg": [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46],
};

function buildFile(name: string, type: string, size = 2048) {
  const signature = FILE_SIGNATURES[type] ?? [0x00, 0x01, 0x02, 0x03];
  const bytes = new Uint8Array(signature);
  const file = new File([bytes], name, { type });
  Object.defineProperty(file, "size", { value: size });
  Object.defineProperty(file, "slice", {
    value: (start = 0, end = bytes.length) => ({
      arrayBuffer: () => Promise.resolve(bytes.slice(start, end).buffer),
    }),
  });
  return file;
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("Verificacion de integracion HU-15 (CA-15.1 a CA-15.6) en DocumentUploadStep", () => {
  let urlCounter = 0;

  beforeAll(() => {
    URL.createObjectURL = jest.fn(() => `blob:preview-${++urlCounter}`);
    URL.revokeObjectURL = jest.fn();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAnalyze.mockReset();
    useRegistrationStore.getState().reset();
    useRegistrationStore.getState().setSessionToken("session-1234");
  });

  it("CA-15.1: al adjuntar imagen se muestra la vista previa e inicia el control sin bloquear el formulario", async () => {
    const deferred = createDeferred<ImageQualityResult>();
    mockedAnalyze.mockReturnValueOnce(deferred.promise);

    render(<DocumentUploadStep />);
    await screen.findByLabelText(/^Tipo de documento/);

    const imageFile = buildFile("doc.jpg", "image/jpeg");
    await act(async () => {
      fireEvent.change(screen.getByTestId("document-input"), {
        target: { files: [imageFile] },
      });
    });

    // Vista previa presente
    expect(await screen.findByText("doc.jpg")).toBeInTheDocument();
    // Estado de análisis visible
    expect(screen.getByText("Analizando la calidad de la imagen...")).toBeInTheDocument();
    // Otros controles del formulario siguen operativos (no bloqueados)
    const select = screen.getByLabelText(/^Tipo de documento/);
    expect(select).not.toBeDisabled();
    fireEvent.change(select, { target: { value: "diploma_academico" } });
    expect(select).toHaveValue("diploma_academico");

    await act(async () => {
      deferred.resolve({ status: "done", warnings: [], metrics: null });
    });
  });

  it("CA-15.2: imagen clara no muestra avisos de advertencia", async () => {
    mockedAnalyze.mockResolvedValueOnce({
      status: "done",
      warnings: [],
      metrics: null,
    });

    render(<DocumentUploadStep />);
    await screen.findByLabelText(/^Tipo de documento/);

    await act(async () => {
      fireEvent.change(screen.getByTestId("document-input"), {
        target: { files: [buildFile("clara.jpg", "image/jpeg")] },
      });
    });

    expect(await screen.findByText("No se detectaron problemas de calidad en la imagen.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Avisos de calidad de imagen")).not.toBeInTheDocument();
  });

  it("CA-15.2: imagen con multiples problemas muestra cada aviso y su recomendacion", async () => {
    mockedAnalyze.mockResolvedValueOnce({
      status: "done",
      warnings: [
        { code: "BLURRY", message: "La imagen parece borrosa.", recommendation: "Sostén firme el celular." },
        { code: "TOO_DARK", message: "La imagen está muy oscura.", recommendation: "Busca un lugar con más luz." },
      ],
      metrics: null,
    });

    render(<DocumentUploadStep />);
    await screen.findByLabelText(/^Tipo de documento/);

    await act(async () => {
      fireEvent.change(screen.getByTestId("document-input"), {
        target: { files: [buildFile("defecto.jpg", "image/jpeg")] },
      });
    });

    expect(await screen.findByLabelText("Avisos de calidad de imagen")).toBeInTheDocument();
    expect(screen.getByText("La imagen parece borrosa.")).toBeInTheDocument();
    expect(screen.getByText("Sostén firme el celular.")).toBeInTheDocument();
    expect(screen.getByText("La imagen está muy oscura.")).toBeInTheDocument();
    expect(screen.getByText("Busca un lugar con más luz.")).toBeInTheDocument();
  });

  it("CA-15.3 y Reemplazos rapidos: reemplazar archivo elimina el aviso viejo y nunca muestra resultados lentos", async () => {
    const slowA = createDeferred<ImageQualityResult>();
    const fastB = createDeferred<ImageQualityResult>();
    mockedAnalyze
      .mockReturnValueOnce(slowA.promise)
      .mockReturnValueOnce(fastB.promise);

    render(<DocumentUploadStep />);
    await screen.findByLabelText(/^Tipo de documento/);

    const fileA = buildFile("primero.jpg", "image/jpeg");
    const fileB = buildFile("segundo.jpg", "image/jpeg");

    // Adjuntar archivo A (lento con avisos)
    await act(async () => {
      fireEvent.change(screen.getByTestId("document-input"), {
        target: { files: [fileA] },
      });
    });

    // Reemplazo rápido por archivo B (nítido)
    const replaceInput = screen.getByTestId("replace-document-input");
    await act(async () => {
      fireEvent.change(replaceInput, {
        target: { files: [fileB] },
      });
    });

    // B resuelve rápido sin avisos
    await act(async () => {
      fastB.resolve({ status: "done", warnings: [], metrics: null });
    });
    expect(await screen.findByText("No se detectaron problemas de calidad en la imagen.")).toBeInTheDocument();

    // A resuelve tarde con advertencia BLURRY
    await act(async () => {
      slowA.resolve({
        status: "done",
        warnings: [{ code: "BLURRY", message: "Aviso viejo de A", recommendation: "rec" }],
        metrics: null,
      });
    });

    // El resultado de A no debe pisar al de B
    expect(screen.queryByText("Aviso viejo de A")).not.toBeInTheDocument();
    expect(screen.getByText("No se detectaron problemas de calidad en la imagen.")).toBeInTheDocument();
  });

  it("Cancelacion: quitar el archivo mientras se analiza limpia el estado y no deja avisos", async () => {
    const deferred = createDeferred<ImageQualityResult>();
    mockedAnalyze.mockReturnValueOnce(deferred.promise);

    render(<DocumentUploadStep />);
    await screen.findByLabelText(/^Tipo de documento/);

    await act(async () => {
      fireEvent.change(screen.getByTestId("document-input"), {
        target: { files: [buildFile("cancel.jpg", "image/jpeg")] },
      });
    });
    expect(screen.getByText("Analizando la calidad de la imagen...")).toBeInTheDocument();

    // Quitar archivo
    fireEvent.click(screen.getByRole("button", { name: "Quitar" }));

    await waitFor(() => {
      expect(screen.queryByText("Analizando la calidad de la imagen...")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Avisos de calidad de imagen")).not.toBeInTheDocument();
    });

    await act(async () => {
      deferred.resolve({
        status: "done",
        warnings: [{ code: "BLURRY", message: "Tarde", recommendation: "rec" }],
        metrics: null,
      });
    });
    expect(screen.queryByText("Tarde")).not.toBeInTheDocument();
  });

  it("CA-15.4: con un aviso presente, el Titulado puede continuar y enviar", async () => {
    mockedAnalyze.mockResolvedValueOnce({
      status: "done",
      warnings: [{ code: "BLURRY", message: "Borroso", recommendation: "Mejora" }],
      metrics: null,
    });

    render(<DocumentUploadStep />);
    await screen.findByLabelText(/^Tipo de documento/);

    fireEvent.change(screen.getByLabelText(/^Tipo de documento/), {
      target: { value: "diploma_academico" },
    });
    await act(async () => {
      fireEvent.change(screen.getByTestId("document-input"), {
        target: { files: [buildFile("borroso.jpg", "image/jpeg")] },
      });
    });
    fireEvent.click(screen.getByLabelText(/Declaro bajo juramento/));

    expect(await screen.findByLabelText("Avisos de calidad de imagen")).toBeInTheDocument();
    const continueBtn = screen.getByRole("button", { name: /Finalizar solicitud/ });
    expect(continueBtn).toBeEnabled();
  });

  it("CA-15.5: formato no admitido o archivo >5MB no ejecuta el control y explica como resolverlo", async () => {
    render(<DocumentUploadStep />);
    await screen.findByLabelText(/^Tipo de documento/);

    const oversizedFile = buildFile("grande.jpg", "image/jpeg", 6 * 1024 * 1024);
    await act(async () => {
      fireEvent.change(screen.getByTestId("document-input"), {
        target: { files: [oversizedFile] },
      });
    });

    expect(
      screen.getByText(/Formato o tamaño no permitido. Adjunta un documento en PDF, PNG o JPG de máximo 5 MB/),
    ).toBeInTheDocument();
    expect(mockedAnalyze).not.toHaveBeenCalled();
    expect(screen.queryByText("Analizando la calidad de la imagen...")).not.toBeInTheDocument();
  });

  it("CA-15.6: PDF admitido (skipped) permite continuar sin avisos de calidad", async () => {
    mockedAnalyze.mockResolvedValueOnce({
      status: "skipped",
      warnings: [],
      metrics: null,
    });

    render(<DocumentUploadStep />);
    await screen.findByLabelText(/^Tipo de documento/);

    fireEvent.change(screen.getByLabelText(/^Tipo de documento/), {
      target: { value: "diploma_academico" },
    });
    await act(async () => {
      fireEvent.change(screen.getByTestId("document-input"), {
        target: { files: [buildFile("documento.pdf", "application/pdf")] },
      });
    });
    fireEvent.click(screen.getByLabelText(/Declaro bajo juramento/));

    expect(screen.queryByLabelText("Avisos de calidad de imagen")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Finalizar solicitud/ })).toBeEnabled();
  });

  it("CA-15.6: fallo del control informa comprensiblemente y permite continuar", async () => {
    mockedAnalyze.mockResolvedValueOnce({
      status: "failed",
      warnings: [],
      metrics: null,
    });

    render(<DocumentUploadStep />);
    await screen.findByLabelText(/^Tipo de documento/);

    fireEvent.change(screen.getByLabelText(/^Tipo de documento/), {
      target: { value: "diploma_academico" },
    });
    await act(async () => {
      fireEvent.change(screen.getByTestId("document-input"), {
        target: { files: [buildFile("fallo.jpg", "image/jpeg")] },
      });
    });
    fireEvent.click(screen.getByLabelText(/Declaro bajo juramento/));

    expect(
      await screen.findByText(/No se pudo comprobar la calidad de la imagen. Puedes abrirla, reemplazarla o continuar/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Finalizar solicitud/ })).toBeEnabled();
  });
});
