import { fireEvent, render, screen } from "@testing-library/react";
import { ObservedNoticeView } from "./observed-notice-view";

describe("ObservedNoticeView", () => {
  it("muestra el estado de carga inicialmente", () => {
    render(<ObservedNoticeView token="abc123" />);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando tu solicitud");
  });

  it("muestra categoría, nota, datos precargados y documento con un enlace válido", async () => {
    render(<ObservedNoticeView token="abc123" />);

    expect(await screen.findByText("Corrige tu solicitud")).toBeInTheDocument();
    expect(screen.getByText("Categoría: Datos personales y contacto")).toBeInTheDocument();
    expect(screen.getByText("Categoría: Documento de respaldo")).toBeInTheDocument();
    expect(screen.getAllByText(/no es completamente legible/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/Nombres/)).toHaveValue("Juan Carlos");
    expect(screen.getByLabelText(/Correo electrónico/)).toHaveValue("carlos.perez.m@correo.com");
    expect(
      screen.getByText("Certificado_Conclusion_Estudios_JuanPerez.pdf"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Revisar cambios/ })).toBeDisabled();
  });

  it("pasa al resumen de entrega y conserva lo escrito al volver a editar", async () => {
    render(<ObservedNoticeView token="abc123" />);
    await screen.findByText("Corrige tu solicitud");

    fireEvent.change(screen.getByLabelText(/Apellidos/), { target: { value: "Quispe" } });
    fireEvent.click(screen.getByRole("button", { name: /Revisar cambios/ }));

    expect(await screen.findByText("Revisión de solicitud")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Entregar solicitud/ })).toBeEnabled();
    expect(screen.getAllByText("Modificado")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /Volver a editar/ }));
    expect(screen.queryByText("Revisión de solicitud")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Apellidos/)).toHaveValue("Quispe");
  });

  it("muestra mensaje claro con un enlace inválido y no permite editar", async () => {
    render(<ObservedNoticeView token="invalido" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Enlace no válido");
    expect(screen.queryByText("Corrige tu solicitud")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Nombres/)).not.toBeInTheDocument();
  });

  it("muestra mensaje claro con un enlace vencido y no permite editar", async () => {
    render(<ObservedNoticeView token="vencido" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Enlace vencido");
    expect(screen.queryByText("Corrige tu solicitud")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Nombres/)).not.toBeInTheDocument();
  });

  it("no permite editar si la solicitud ya no está observada", async () => {
    render(<ObservedNoticeView token="no-observada" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Esta solicitud ya no está observada",
    );
    expect(screen.queryByText("Corrige tu solicitud")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Nombres/)).not.toBeInTheDocument();
  });
});