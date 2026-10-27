import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ObservedEditForm } from "./observed-edit-form";
import { validateDocumentFile } from "@/modules/documents/frontend/validation/document-file";

jest.mock("@/modules/documents/frontend/validation/document-file", () => ({
  ...jest.requireActual("@/modules/documents/frontend/validation/document-file"),
  validateDocumentFile: jest.fn(),
}));

const mockedValidate = validateDocumentFile as jest.MockedFunction<typeof validateDocumentFile>;

const initial = {
  firstName: "Juan Carlos",
  lastName: "Pérez Mamani",
  birthDate: "1998-05-14",
  ci: "6842109",
  complement: "",
  issuedIn: "CB",
  email: "a@correo.com",
  phone: "70745821",
  career: "Sistemas",
  graduationYear: "2023",
  sisCode: "201804921",
  documentType: "Título en Provisión Nacional",
};
const doc = { name: "doc.pdf", sizeLabel: "4 MB", uploadedAt: "2026-10-20", url: "#" };

function setup() {
  const onReview = jest.fn();
  const onVerify = jest.fn();
  const onCancel = jest.fn();
  render(
    <ObservedEditForm
      initial={initial}
      currentDocument={doc}
      onReview={onReview}
      onRequireEmailVerification={onVerify}
      onCancel={onCancel}
    />,
  );
  return { onReview, onVerify, onCancel };
}

const reviewButton = () => screen.getByRole("button", { name: /Revisar cambios/ });
const fileInput = () => screen.getByLabelText("Subir documento de respaldo");

beforeEach(() => {
  mockedValidate.mockReset();
});

describe("ObservedEditForm", () => {
  it("precarga los valores y deshabilita 'Revisar cambios' sin cambios", () => {
    setup();
    expect(screen.getByLabelText(/Nombres/)).toHaveValue("Juan Carlos");
    expect(screen.getByLabelText(/Apellidos/)).toHaveValue("Pérez Mamani");
    expect(screen.getByLabelText(/Correo electrónico/)).toHaveValue("a@correo.com");
    expect(reviewButton()).toBeDisabled();
  });

  it("habilita 'Revisar cambios' al modificar un dato", () => {
    setup();
    fireEvent.change(screen.getByLabelText(/Apellidos/), { target: { value: "Quispe" } });
    expect(reviewButton()).toBeEnabled();
  });

  it("llama a onReview con solo el campo cambiado y conserva el resto", () => {
    const { onReview, onVerify } = setup();
    fireEvent.change(screen.getByLabelText(/Apellidos/), { target: { value: "Quispe" } });
    fireEvent.click(reviewButton());

    expect(onVerify).not.toHaveBeenCalled();
    expect(onReview).toHaveBeenCalledTimes(1);
    const result = onReview.mock.calls[0][0];
    expect(result.changedFields).toEqual(["lastName"]);
    expect(result.values.firstName).toBe("Juan Carlos");
    expect(result.values.lastName).toBe("Quispe");
    expect(result.emailChanged).toBe(false);
  });

  it("muestra error y no avanza si se vacía un campo obligatorio", () => {
    const { onReview, onVerify } = setup();
    fireEvent.change(screen.getByLabelText(/Nombres/), { target: { value: "" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Este campo es obligatorio.");

    fireEvent.click(reviewButton());
    expect(onReview).not.toHaveBeenCalled();
    expect(onVerify).not.toHaveBeenCalled();
  });

  it("valida el formato del correo con la regla del registro", () => {
    const { onReview, onVerify } = setup();
    fireEvent.change(screen.getByLabelText(/Correo electrónico/), { target: { value: "mal" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Ingresa un correo electrónico válido.");

    fireEvent.click(reviewButton());
    expect(onReview).not.toHaveBeenCalled();
    expect(onVerify).not.toHaveBeenCalled();
  });

  it("valida el teléfono de 8 dígitos con la regla del registro", () => {
    setup();
    fireEvent.change(screen.getByLabelText(/Teléfono/), { target: { value: "123" } });
    expect(screen.getByRole("alert")).toHaveTextContent("El teléfono debe tener 8 dígitos.");
  });

  it("valida el C.I. con la regla del registro", () => {
    setup();
    fireEvent.change(screen.getByLabelText(/Cédula de Identidad/), { target: { value: "12.3" } });
    expect(screen.getByRole("alert")).toHaveTextContent("El C.I. debe tener entre 5 y 10 dígitos");
  });

  it("valida el Código SIS con la regla del registro", () => {
    setup();
    fireEvent.change(screen.getByLabelText(/Código SIS/), { target: { value: "12" } });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "El Código SIS debe tener de 6 a 9 dígitos.",
    );
  });

  it("avisa y envía a verificación si cambió el correo", () => {
    const { onReview, onVerify } = setup();
    fireEvent.change(screen.getByLabelText(/Correo electrónico/), {
      target: { value: "nuevo@correo.com" },
    });
    expect(screen.getByRole("status")).toHaveTextContent("Cambiaste tu correo");

    fireEvent.click(reviewButton());
    expect(onVerify).toHaveBeenCalledTimes(1);
    expect(onVerify.mock.calls[0][0].emailChanged).toBe(true);
    expect(onReview).not.toHaveBeenCalled();
  });

  it("rechaza archivos con formato inválido", async () => {
    setup();
    fireEvent.change(fileInput(), {
      target: { files: [new File(["x"], "a.exe", { type: "application/x-msdownload" })] },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("Formato o tamaño no permitido");
    expect(reviewButton()).toBeDisabled();
  });

  it("rechaza un archivo cuya firma real no coincide con su extensión", async () => {
    setup();
    mockedValidate.mockResolvedValue(null);
    fireEvent.change(fileInput(), {
      target: { files: [new File(["no soy pdf"], "falso.pdf", { type: "application/pdf" })] },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("Formato o tamaño no permitido");
    expect(reviewButton()).toBeDisabled();
  });

  it("acepta un archivo válido, habilita el botón y lo incluye en el resultado", async () => {
    const { onReview } = setup();
    mockedValidate.mockResolvedValue("pdf");
    const nuevo = new File(["%PDF-1.4"], "nuevo.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput(), { target: { files: [nuevo] } });

    expect(await screen.findByText("nuevo.pdf")).toBeInTheDocument();
    await waitFor(() => expect(reviewButton()).toBeEnabled());

    fireEvent.click(reviewButton());
    expect(onReview).toHaveBeenCalledTimes(1);
    expect(onReview.mock.calls[0][0].file).toBe(nuevo);
  });

  it("llama a onCancel al presionar Cancelar", () => {
    const { onCancel } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});