import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ObservedReviewSubmit } from "./observed-review-submit";
import { resubmitObservedApplication } from "../services/application.service";
import type { CorrectionResult } from "../hooks/use-observed-correction";

jest.mock("../services/application.service", () => ({
  resubmitObservedApplication: jest.fn(),
}));
const mockedSubmit = resubmitObservedApplication as jest.MockedFunction<
  typeof resubmitObservedApplication
>;

const values = {
  firstName: "Juan Carlos",
  lastName: "Quispe",
  ci: "6842109",
  complement: "",
  issuedIn: "CB",
  email: "a@correo.com",
  phone: "70745821",
  career: "10000000-0000-4000-8000-000000000001",
  graduationYear: "2023",
  sisCode: "201804921",
  documentType: "Título en Provisión Nacional",
};
const base: CorrectionResult = {
  values,
  changedFields: ["lastName"],
  file: null,
  emailChanged: false,
};

function setup(result: CorrectionResult = base, acceptDeclaration = true) {
  const onBack = jest.fn();
  const view = render(
    <ObservedReviewSubmit
      token="abc123"
      version={2}
      result={result}
      careerName="Ingeniería de Sistemas"
      currentDocument={{ name: "doc.pdf" }}
      hasPreviousDocument
      onBack={onBack}
    />,
  );
  if (acceptDeclaration) fireEvent.click(screen.getByRole('checkbox'));
  return { onBack, ...view };
}
const submit = () => screen.getByRole("button", { name: /Entregar solicitud|Reintentar/ });

beforeEach(() => mockedSubmit.mockReset());

describe("ObservedReviewSubmit", () => {
  it('exige aceptar la declaración también al reenviar una corrección', () => {
    setup(base, false);
    expect(submit()).toBeDisabled();
    fireEvent.click(submit());
    expect(mockedSubmit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(submit()).toBeEnabled();
  });
  it("muestra el resumen y marca los campos modificados", () => {
    setup();
    expect(screen.getByText(/Quispe/)).toBeInTheDocument();
    expect(screen.getByText("Ingeniería de Sistemas")).toBeVisible();
    expect(screen.queryByText(values.career)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver documento previo" })).toBeEnabled();
    expect(screen.getAllByText("Modificado")).toHaveLength(1);
  });

  it("ofrece la vista previa del archivo de reemplazo en el resumen", () => {
    URL.createObjectURL = jest.fn(() => "blob:reemplazo");
    URL.revokeObjectURL = jest.fn();
    const file = new File(["imagen"], "reemplazo.png", { type: "image/png" });
    const { unmount } = setup({ ...base, file });
    expect(screen.getByText("reemplazo.png")).toBeVisible();
    expect(screen.getByRole("img", { name: "Vista previa de reemplazo.png" }))
      .toHaveAttribute("src", "blob:reemplazo");
    expect(screen.queryByRole("button", { name: "Ver documento previo" })).not.toBeInTheDocument();
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:reemplazo");
  });

  it("entrega sobre el mismo expediente (con el token y la versión) y muestra la confirmación", async () => {
    mockedSubmit.mockResolvedValue({ status: "success" });
    setup();
    fireEvent.click(submit());
    expect(await screen.findByText("Corrección entregada")).toBeInTheDocument();
    expect(mockedSubmit).toHaveBeenCalledWith(
      "abc123",
      base,
      expect.objectContaining({ version: 2 }),
    );
  });

  it("ante un error mantiene los datos y permite reintentar", async () => {
    mockedSubmit.mockResolvedValueOnce({ status: "error", message: "Falló el servidor" });
    setup();
    fireEvent.click(submit());
    expect(await screen.findByRole("alert")).toHaveTextContent("Falló el servidor");
    expect(screen.getByText(/Quispe/)).toBeInTheDocument();

    mockedSubmit.mockResolvedValueOnce({ status: "success" });
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Corrección entregada")).toBeInTheDocument();
  });

  it("reutiliza el mismo progreso al reintentar", async () => {
    mockedSubmit.mockResolvedValueOnce({ status: "error", message: "Falló" });
    setup();
    fireEvent.click(submit());
    await screen.findByRole("alert");

    mockedSubmit.mockResolvedValueOnce({ status: "success" });
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await screen.findByText("Corrección entregada");

    const firstProgress = mockedSubmit.mock.calls[0][2];
    const secondProgress = mockedSubmit.mock.calls[1][2];
    expect(secondProgress).toBe(firstProgress);
  });

  it("muestra el aviso de CA-10.5 ante un conflicto", async () => {
    mockedSubmit.mockResolvedValue({ status: "conflict" });
    setup();
    fireEvent.click(submit());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La solicitud cambió; actualiza antes de guardar",
    );
  });

  it("avisa que debe verificar el nuevo correo si el backend lo exige", async () => {
    mockedSubmit.mockResolvedValue({ status: "email-verification" });
    setup();
    fireEvent.click(submit());
    expect(await screen.findByRole("alert")).toHaveTextContent("verificar tu nuevo correo");
  });

  it("bloquea la entrega con un enlace vencido", async () => {
    mockedSubmit.mockResolvedValue({ status: "expired" });
    setup();
    fireEvent.click(submit());
    expect(await screen.findByRole("alert")).toHaveTextContent("Este enlace venció");
    expect(screen.queryByRole("button", { name: /Entregar solicitud/ })).not.toBeInTheDocument();
  });

  it("bloquea la entrega con un enlace inválido", async () => {
    mockedSubmit.mockResolvedValue({ status: "invalid-link" });
    setup();
    fireEvent.click(submit());
    expect(await screen.findByRole("alert")).toHaveTextContent("Este enlace ya no es válido");
  });

  it("evita el doble envío", async () => {
    let resolve!: (v: { status: "success" }) => void;
    mockedSubmit.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    setup();
    fireEvent.click(submit());
    fireEvent.click(screen.getByRole("button", { name: /Entregando/ }));
    expect(mockedSubmit).toHaveBeenCalledTimes(1);
    resolve({ status: "success" });
    await waitFor(() => expect(screen.getByText("Corrección entregada")).toBeInTheDocument());
  });

  it("bloquea la entrega si cambió el correo", () => {
    setup({ ...base, changedFields: ["email"], emailChanged: true });
    expect(submit()).toBeDisabled();
  });

  it("llama a onBack con 'Volver a editar'", () => {
    const { onBack } = setup();
    fireEvent.click(screen.getByRole("button", { name: /Volver a editar/ }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
