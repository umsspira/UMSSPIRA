import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StatusQueryForm } from "./status-query-form";
import {
  requestApplicationStatus,
  STATUS_QUERY_GENERIC_MESSAGE,
} from "../services/status-query.service";

jest.mock("../services/status-query.service", () => ({
  ...jest.requireActual("../services/status-query.service"),
  requestApplicationStatus: jest.fn(),
}));

const mockedRequestApplicationStatus =
  requestApplicationStatus as jest.MockedFunction<
    typeof requestApplicationStatus
  >;

describe("StatusQueryForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("valida que el correo sea obligatorio y tenga un formato válido", () => {
    render(<StatusQueryForm />);

    fireEvent.click(
      screen.getByRole("button", { name: "Solicitar estado" }),
    );

    expect(
      screen.getByText("Ingresa tu correo electrónico"),
    ).toBeInTheDocument();
    expect(mockedRequestApplicationStatus).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Correo electrónico/), {
      target: { value: "correo-invalido" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Solicitar estado" }),
    );

    expect(
      screen.getByText("Ingresa un correo electrónico válido"),
    ).toBeInTheDocument();
    expect(mockedRequestApplicationStatus).not.toHaveBeenCalled();
  });

  it("solicita el estado y muestra siempre el mensaje general", async () => {
    mockedRequestApplicationStatus.mockResolvedValue(
      STATUS_QUERY_GENERIC_MESSAGE,
    );

    render(<StatusQueryForm />);

    fireEvent.change(screen.getByLabelText(/Correo electrónico/), {
      target: { value: " Titulado@UMSS.EDU.BO " },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Solicitar estado" }),
    );

    await waitFor(() => {
      expect(mockedRequestApplicationStatus).toHaveBeenCalledWith(
        "Titulado@UMSS.EDU.BO",
      );
    });

    expect(await screen.findByRole("status")).toHaveTextContent(
      STATUS_QUERY_GENERIC_MESSAGE,
    );
  });

  it("impide un segundo envío mientras la solicitud está en curso", async () => {
    let resolveRequest!: (message: string) => void;

    mockedRequestApplicationStatus.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    render(<StatusQueryForm />);

    fireEvent.change(screen.getByLabelText(/Correo electrónico/), {
      target: { value: "titulado@umss.edu.bo" },
    });

    const submitButton = screen.getByRole("button", {
      name: "Solicitar estado",
    });

    fireEvent.click(submitButton);

    expect(
      screen.getByRole("button", { name: "Solicitando..." }),
    ).toBeDisabled();

    fireEvent.click(
      screen.getByRole("button", { name: "Solicitando..." }),
    );

    expect(mockedRequestApplicationStatus).toHaveBeenCalledTimes(1);

    resolveRequest(STATUS_QUERY_GENERIC_MESSAGE);

    expect(await screen.findByRole("status")).toHaveTextContent(
      STATUS_QUERY_GENERIC_MESSAGE,
    );
  });

  it("muestra un error recuperable cuando la petición falla", async () => {
    mockedRequestApplicationStatus.mockRejectedValue(
      new Error("Servidor no disponible"),
    );

    render(<StatusQueryForm />);

    fireEvent.change(screen.getByLabelText(/Correo electrónico/), {
      target: { value: "titulado@umss.edu.bo" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Solicitar estado" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo solicitar el estado en este momento",
    );

    expect(
      screen.getByRole("button", { name: "Solicitar estado" }),
    ).toBeEnabled();
  });
});