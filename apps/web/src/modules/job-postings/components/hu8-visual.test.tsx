jest.mock("next/headers", () => ({
  cookies: () => ({ get: () => undefined }),
}));
jest.mock("@/shared/services/job-postings", () => ({
  listJobPostings: jest.fn().mockResolvedValue([]),
}));

import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { RequisitoTecnico as TechnicalVacancyRequirement } from "@/lib/vacancies/contracts";
import JobPostingsPage from "@/app/(dashboard)/job-postings/page";
import {
  getTechnicalVacancyRequirements,
  TechnicalRequirementsError,
} from "../services/technical-requirements";
import JobsBoard from "./jobs-board";
import JobsListingView from "./jobs-listing-view";
import RequirementsConsultation from "./requirements-consultation";
import JobPostingDetail from "./job-posting-detail";

jest.mock("@/modules/job-postings/services/technical-requirements", () => ({
  ...jest.requireActual(
    "@/modules/job-postings/services/technical-requirements",
  ),
  getTechnicalVacancyRequirements: jest.fn(),
}));

const getRequirements = jest.mocked(getTechnicalVacancyRequirements);
const vacancyId = "cdd89b13-bd3f-45c1-a020-91ca5f3747a5";
const requirement: TechnicalVacancyRequirement = {
  id: "req-1",
  idVacante: vacancyId,
  competencia: "SQL",
  nivel: "Avanzado",
  tipo: "Obligatorio",
};
// These rows are test inputs for presentation only, never application data.
const rows = [
  {
    id: "vacante/1",
    titulo: "Analista de datos",
    empresa: "Empresa de prueba A",
    area: "Tecnología",
    modalidad: "Remoto",
    ubicacion: "Cochabamba",
    fechaPublicacion: "2026-01-01",
  },
  {
    id: "vacante-2",
    titulo: "Diseñador",
    empresa: "Empresa de prueba B",
    area: "Diseño",
    modalidad: "Presencial",
    ubicacion: "La Paz",
    fechaPublicacion: "2026-02-01",
  },
];

beforeEach(() => getRequirements.mockReset());

it("distingue un listado no integrado de un listado vacío y mantiene la consulta por ID", () => {
  render(
    <JobsListingView
      controls={null}
      lookup={<RequirementsConsultation linkToDetail />}
    />,
  );
  expect(
    screen.getByRole("heading", { name: "Bolsa de trabajo" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Listado aún no disponible" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("table")).toHaveTextContent("Vacante y empresa");
  expect(screen.getByRole("searchbox")).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Actualizar listado" }),
  ).toBeDisabled();
  expect(
    screen.queryByRole("textbox", { name: "ID de la vacante" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "Competencias requeridas" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Consultar por ID" }));
  expect(
    screen.getByRole("textbox", { name: "ID de la vacante" }),
  ).toBeEnabled();
  expect(screen.queryByText("Sin vacantes")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "Ver oferta" }),
  ).not.toBeInTheDocument();
  expect(getRequirements).not.toHaveBeenCalled();
});

it("prepara orden, filtros y enlaces de filas sin definir ni consultar una API de listado", () => {
  render(<JobsBoard state={{ status: "ready", vacancies: rows }} />);
  expect(
    screen.getAllByRole("link", { name: /Ver oferta:/ })[0],
  ).toHaveAccessibleName("Ver oferta: Diseñador");
  fireEvent.change(
    screen.getByRole("combobox", { name: "Orden de publicación" }),
    { target: { value: "oldest" } },
  );
  expect(
    screen.getAllByRole("link", { name: /Ver oferta:/ })[0],
  ).toHaveAccessibleName("Ver oferta: Analista de datos");
  fireEvent.change(screen.getByRole("combobox", { name: "Área laboral" }), {
    target: { value: "Tecnología" },
  });
  expect(screen.getAllByRole("link", { name: /Ver oferta:/ })).toHaveLength(1);
  expect(
    screen.getByRole("link", { name: "Ver oferta: Analista de datos" }),
  ).toHaveAttribute("href", "/job-postings/vacante%2F1");
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "no coincide" },
  });
  expect(
    screen.getByRole("heading", { name: "No encontramos vacantes" }),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getAllByRole("button", { name: "Limpiar filtros" })[0],
  );
  expect(screen.getAllByRole("link", { name: /Ver oferta:/ })).toHaveLength(2);
  expect(getRequirements).not.toHaveBeenCalled();
});

it("admite un listado realmente vacío sin confundirlo con integración pendiente", () => {
  render(<JobsBoard state={{ status: "ready", vacancies: [] }} />);
  expect(
    screen.getByRole("heading", { name: "Sin vacantes" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByText("Listado aún no disponible"),
  ).not.toBeInTheDocument();
});

it("prepara skeleton y reintento del listado mediante estados y callbacks explícitos", () => {
  const retry = jest.fn();
  const { rerender } = render(<JobsBoard state={{ status: "loading" }} />);
  expect(screen.getByRole("status")).toHaveTextContent("Cargando vacantes");
  rerender(
    <JobsBoard
      state={{
        status: "error",
        message: "Consulta interrumpida",
        onRetry: retry,
      }}
    />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Consulta interrumpida");
  fireEvent.click(screen.getByRole("button", { name: "Reintentar listado" }));
  expect(retry).toHaveBeenCalledTimes(1);
});

it("habilita Ver oferta para el ID consultado sin inventar datos generales", async () => {
  getRequirements.mockResolvedValue([requirement]);
  render(<JobPostingsPage />);
  fireEvent.click(screen.getByRole("button", { name: "Consultar por ID" }));
  fireEvent.change(screen.getByRole("textbox", { name: "ID de la vacante" }), {
    target: { value: vacancyId },
  });
  fireEvent.click(screen.getByRole("button", { name: "Consultar" }));
  expect(
    await screen.findByRole("link", { name: "Ver oferta" }),
  ).toHaveAttribute("href", `/job-postings/${vacancyId}`);
  expect(
    screen.getByText(/Abre el detalle real de la oferta/),
  ).toBeInTheDocument();
});

it("consulta competencias en el detalle mientras muestra los datos generales como pendientes", async () => {
  getRequirements.mockResolvedValue([requirement]);
  render(<JobPostingDetail id={vacancyId} />);
  expect(await screen.findByRole("listitem")).toHaveTextContent("SQL");
  expect(
    screen.getByRole("heading", { name: "Competencias requeridas" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Detalle de la vacante" }),
  ).toBeInTheDocument();
  expect(getRequirements).toHaveBeenCalledWith(
    vacancyId,
    expect.any(AbortSignal),
  );
  expect(
    screen.getByRole("link", { name: "Volver a vacantes" }),
  ).toHaveAttribute("href", "/job-postings");
  expect(
    screen.getByRole("button", { name: "Postular a la oferta" }),
  ).toBeDisabled();
  expect(screen.getByRole("button", { name: "Guardar oferta" })).toBeDisabled();
});

it("mantiene el detalle y permite reintentar competencias sin afirmar que un 404 prueba inexistencia", async () => {
  getRequirements
    .mockRejectedValueOnce(
      new TechnicalRequirementsError(
        "No se pudo confirmar si la vacante existe.",
        404,
      ),
    )
    .mockResolvedValueOnce([]);
  render(<JobPostingDetail id={vacancyId} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Error HTTP 404");
  expect(
    screen.getByRole("heading", { name: "Acerca del puesto" }),
  ).toBeInTheDocument();
  expect(screen.queryByText("Vacante no encontrada")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  expect(
    await screen.findByText(
      "La consulta no devolvió requisitos técnicos para este ID.",
    ),
  ).toBeInTheDocument();
  expect(getRequirements).toHaveBeenNthCalledWith(
    2,
    vacancyId,
    expect.any(AbortSignal),
  );
});

it("cancela y descarta una consulta anterior al navegar a otro ID del detalle", async () => {
  let resolveFirst!: (requirements: TechnicalVacancyRequirement[]) => void;
  let resolveSecond!: (requirements: TechnicalVacancyRequirement[]) => void;
  getRequirements
    .mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirst = resolve;
      }),
    )
    .mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSecond = resolve;
      }),
    );
  const { rerender } = render(<JobPostingDetail id={vacancyId} />);
  const firstSignal = getRequirements.mock.calls[0][1];
  rerender(<JobPostingDetail id="otro-id" />);
  expect(firstSignal?.aborted).toBe(true);
  await act(async () => resolveFirst([requirement]));
  expect(screen.queryByText("SQL")).not.toBeInTheDocument();
  await act(async () => resolveSecond([]));
  expect(
    screen.getByText(
      "La consulta no devolvió requisitos técnicos para este ID.",
    ),
  ).toBeInTheDocument();
});
