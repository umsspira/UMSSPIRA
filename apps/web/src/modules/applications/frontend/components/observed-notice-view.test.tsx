
import { fireEvent, render, screen } from "@testing-library/react";
import { ObservedNoticeView } from "./observed-notice-view";
import * as applicationService from "../services/application.service";

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

jest.mock("../services/application.service", () => ({
  ...jest.requireActual("../services/application.service"),
  getObservedApplication: jest.fn(),
}));

const mockDetail = {
  id: "app-123",
  version: 2,
  nombres: "Juan Carlos",
  apellidos: "Pérez Mamani",
  ci: "6842109",
  complementoCi: "",
  expedidoEn: "CB",
  codigoSis: "201804921",
  correo: "carlos.perez.m@correo.com",
  telefono: "70745821",
  carreraId: "carrera-uuid-1",
  anioEgreso: 2023,
  deseaMentor: false,
  fechaTitulacion: null,
  fechaIngreso: "1998-05-14",
  observacion: {
    categoria: "Datos personales y contacto",
    justificacion: "El documento adjunto no es completamente legible.",
    fecha: "2026-10-22T11:30:00.000Z",
  },
  documento: {
    id: "doc-1",
    nombre: "Certificado_Conclusion_Estudios_JuanPerez.pdf",
    tipoDocumento: "Título en Provisión Nacional",
    mime: "application/pdf",
    sizeBytes: 4.2 * 1024 * 1024,
  },
};

describe("ObservedNoticeView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("muestra el estado de carga inicialmente", () => {
    (applicationService.getObservedApplication as jest.Mock).mockReturnValue(
      new Promise(() => {}),
    );

    render(<ObservedNoticeView token="abc123" />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Cargando tu solicitud",
    );
  });

  it("muestra motivos y explicación de una observación nueva", async () => {
    (applicationService.getObservedApplication as jest.Mock).mockResolvedValue({
      status: "success",
      data: {
        ...mockDetail,
        observacion: {
          ...mockDetail.observacion,
          categoria: null,
          motivos: [
            "documento_ilegible",
            "datos_no_coinciden",
          ],
          justificacion:
            "Adjunta un documento legible y verifica los datos declarados.",
        },
      },
    });

    render(<ObservedNoticeView token="abc123" />);

    expect(
      await screen.findByText("Corrige tu solicitud"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Motivos de la observación"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Documento ilegible o borroso"),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Datos declarados no coinciden con el respaldo",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Adjunta un documento legible y verifica los datos declarados.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.queryByText(/Categoría:/),
    ).not.toBeInTheDocument();
  });

  it("no repite motivos duplicados", async () => {
    (applicationService.getObservedApplication as jest.Mock).mockResolvedValue({
      status: "success",
      data: {
        ...mockDetail,
        observacion: {
          ...mockDetail.observacion,
          motivos: [
            "documento_ilegible",
            "documento_ilegible",
            "otro_motivo",
          ],
        },
      },
    });

    render(<ObservedNoticeView token="abc123" />);

    expect(
      await screen.findByText("Documento ilegible o borroso"),
    ).toBeInTheDocument();

    expect(
      screen.getAllByText("Documento ilegible o borroso"),
    ).toHaveLength(1);

    expect(screen.getByText("Otro motivo")).toBeInTheDocument();
  });

  it("muestra el texto original en una observación antigua", async () => {
    (applicationService.getObservedApplication as jest.Mock).mockResolvedValue({
      status: "success",
      data: mockDetail,
    });

    render(<ObservedNoticeView token="abc123" />);

    expect(
      await screen.findByText("Corrige tu solicitud"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Categoría: Datos personales y contacto"),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/no es completamente legible/i),
    ).toBeInTheDocument();

    expect(
      screen.queryByText("Motivos de la observación"),
    ).not.toBeInTheDocument();
  });

  it("maneja una lista vacía de motivos sin romper la pantalla", async () => {
    (applicationService.getObservedApplication as jest.Mock).mockResolvedValue({
      status: "success",
      data: {
        ...mockDetail,
        observacion: {
          ...mockDetail.observacion,
          motivos: [],
        },
      },
    });

    render(<ObservedNoticeView token="abc123" />);

    expect(
      await screen.findByText("Corrige tu solicitud"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Categoría: Datos personales y contacto"),
    ).toBeInTheDocument();
  });

  it("muestra un mensaje si no hay justificación registrada", async () => {
    (applicationService.getObservedApplication as jest.Mock).mockResolvedValue({
      status: "success",
      data: {
        ...mockDetail,
        observacion: {
          ...mockDetail.observacion,
          justificacion: null,
        },
      },
    });

    render(<ObservedNoticeView token="abc123" />);

    expect(
      await screen.findByText("Sin justificación registrada."),
    ).toBeInTheDocument();
  });

  it("mantiene los datos precargados y el documento anterior", async () => {
    (applicationService.getObservedApplication as jest.Mock).mockResolvedValue({
      status: "success",
      data: mockDetail,
    });

    render(<ObservedNoticeView token="abc123" />);

    expect(
      await screen.findByText("Corrige tu solicitud"),
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/Nombres/)).toHaveValue("Juan Carlos");

    expect(screen.getByLabelText(/Correo electrónico/)).toHaveValue(
      "carlos.perez.m@correo.com",
    );

    expect(
      screen.getByText("Certificado_Conclusion_Estudios_JuanPerez.pdf"),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /Revisar cambios/ }),
    ).toBeDisabled();
  });

  it("pasa al resumen y conserva los cambios al volver a editar", async () => {
    (applicationService.getObservedApplication as jest.Mock).mockResolvedValue({
      status: "success",
      data: mockDetail,
    });

    render(<ObservedNoticeView token="abc123" />);

    await screen.findByText("Corrige tu solicitud");

    fireEvent.change(screen.getByLabelText(/Apellidos/), {
      target: { value: "Quispe" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Revisar cambios/ }),
    );

    expect(
      await screen.findByText("Revisión de solicitud"),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /Entregar solicitud/ }),
    ).toBeDisabled();

    fireEvent.click(
      screen.getByRole("checkbox", { name: /Declaración de veracidad/ }),
    );

    expect(
      screen.getByRole("button", { name: /Entregar solicitud/ }),
    ).toBeEnabled();

    expect(screen.getAllByText("Modificado")).toHaveLength(1);

    fireEvent.click(
      screen.getByRole("button", { name: /Volver a editar/ }),
    );

    expect(
      screen.queryByText("Revisión de solicitud"),
    ).not.toBeInTheDocument();

    expect(screen.getByLabelText(/Apellidos/)).toHaveValue("Quispe");
  });

  it("muestra mensaje con un enlace inválido y no permite editar", async () => {
    (applicationService.getObservedApplication as jest.Mock).mockResolvedValue({
      status: "invalid-link",
    });

    render(<ObservedNoticeView token="invalido" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enlace no válido o vencido",
    );

    expect(
      screen.queryByText("Corrige tu solicitud"),
    ).not.toBeInTheDocument();

    expect(screen.queryByLabelText(/Nombres/)).not.toBeInTheDocument();
  });

  it("muestra error de conexión y permite reintentar", async () => {
    (applicationService.getObservedApplication as jest.Mock).mockResolvedValue({
      status: "error",
      message: "Fallo de red simulado",
    });

    render(<ObservedNoticeView token="error-token" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Error de conexión",
    );

    expect(
      screen.getByText("Fallo de red simulado"),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /Reintentar/ }),
    ).toBeInTheDocument();
  });
});
