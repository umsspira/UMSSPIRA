jest.mock("next/headers", () => ({
  cookies: () => ({ get: () => undefined }),
}));
jest.mock("@/shared/services/job-postings", () => ({
  listJobPostings: jest.fn().mockResolvedValue([]),
}));

import "@testing-library/jest-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
import JobPostingsPage from "@/app/(dashboard)/job-postings/page";
import JobPostingDetailPage from "@/app/(dashboard)/job-postings/[id]/page";
import JobsHeader from "../components/jobs-header";
import { getTechnicalVacancyRequirements } from "../services/technical-requirements";
import { demoHref, resolveDemoScenario, scenarioHref } from "./mode";

jest.mock("@/modules/job-postings/services/technical-requirements", () => ({
  ...jest.requireActual(
    "@/modules/job-postings/services/technical-requirements",
  ),
  getTechnicalVacancyRequirements: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("hu8Demo=listado"),
}));

const getRequirements = jest.mocked(getTechnicalVacancyRequirements);
const originalFetch = global.fetch;
const fetchMock = jest.fn();
const firstId = "80000000-0000-4000-8000-000000000001";
const backendId = "80000000-0000-4000-8000-000000000002";

beforeEach(() => {
  getRequirements.mockReset();
  fetchMock.mockReset();
  global.fetch = fetchMock;
});
afterEach(() => {
  expect(fetchMock).not.toHaveBeenCalled();
  expect(getRequirements).not.toHaveBeenCalled();
  global.fetch = originalFetch;
});

it("mantiene la consulta real plegada hasta solicitarla y permite cerrarla con Escape", async () => {
  render(<JobPostingsPage />);
  await screen.findByText("No hay vacantes disponibles en este momento.");
  expect(screen.getByText("Modo real")).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "Competencias requeridas" }),
  ).not.toBeInTheDocument();
  const toggle = screen.getByRole("button", { name: "Consultar por ID" });
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(toggle);
  const input = screen.getByRole("textbox", { name: "ID de la vacante" });
  expect(input).toHaveFocus();
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  fireEvent.keyDown(input, { key: "Escape" });
  expect(screen.queryByRole("form")).not.toBeInTheDocument();
  expect(toggle).toHaveFocus();
  expect(
    screen.getByRole("link", { name: "Activar demostración" }),
  ).toHaveAttribute("href", "/job-postings?hu8Demo=listado");
});

it("recupera las seis ofertas originales, identifica la demo y conserva el modo en Ver oferta", async () => {
  render(<JobPostingsPage searchParams={{ hu8Demo: "listado" }} />);
  expect(
    screen.getByRole("region", { name: "Modo demostración" }),
  ).toHaveTextContent("Datos de demostración");
  expect(
    await screen.findByRole("link", {
      name: "Ver oferta: Desarrollador Frontend Junior",
    }),
  ).toHaveAttribute("href", demoHref(`/job-postings/${firstId}`, "listado"));
  expect(screen.getAllByRole("link", { name: /Ver oferta:/ })).toHaveLength(6);
  expect(screen.getByRole("searchbox")).toBeEnabled();
  expect(
    screen.queryByRole("heading", { name: "Competencias requeridas" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Volver al modo real" }),
  ).toHaveAttribute("href", "/job-postings");
});

it("habilita búsqueda, filtros, ordenación y limpieza sobre los ejemplos", async () => {
  render(<JobPostingsPage searchParams={{ hu8Demo: "listado" }} />);
  await screen.findByRole("link", {
    name: "Ver oferta: Desarrollador Frontend Junior",
  });
  fireEvent.change(
    screen.getByRole("combobox", { name: "Orden de registro" }),
    { target: { value: "oldest" } },
  );
  expect(
    screen.getAllByRole("link", { name: /Ver oferta:/ })[0],
  ).toHaveAccessibleName("Ver oferta: Especialista en Ciberseguridad");
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "Jalasoft" },
  });
  expect(screen.getAllByRole("link", { name: /Ver oferta:/ })).toHaveLength(2);
  fireEvent.change(screen.getByRole("combobox", { name: "Área laboral" }), {
    target: { value: "Análisis de datos" },
  });
  expect(screen.getAllByRole("link", { name: /Ver oferta:/ })).toHaveLength(1);
  fireEvent.change(
    screen.getByRole("combobox", { name: "Modalidad de trabajo" }),
    { target: { value: "Híbrido" } },
  );
  expect(
    screen.getByRole("link", { name: "Ver oferta: Analista de Datos Junior" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
  expect(screen.getAllByRole("link", { name: /Ver oferta:/ })).toHaveLength(6);
});

it("actualiza el listado de demo con las dos ofertas adicionales originales", async () => {
  render(<JobPostingsPage searchParams={{ hu8Demo: "listado" }} />);
  await screen.findByRole("link", {
    name: "Ver oferta: Desarrollador Frontend Junior",
  });
  fireEvent.click(screen.getByRole("button", { name: "Actualizar listado" }));
  await screen.findByRole("link", {
    name: "Ver oferta: Diseñador de Experiencia de Usuario",
  });
  expect(screen.getAllByRole("link", { name: /Ver oferta:/ })).toHaveLength(8);
});

it("abre un detalle demo completo sin montar el adaptador real", async () => {
  render(
    <JobPostingDetailPage
      params={{ id: firstId }}
      searchParams={{ hu8Demo: "listado" }}
    />,
  );
  expect(
    await screen.findByRole("heading", {
      name: "Desarrollador Frontend Junior",
    }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Responsabilidades" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Lo que ofrecemos" }),
  ).toBeInTheDocument();
  const competencies = screen.getByRole("region", {
    name: "Competencias requeridas",
  });
  expect(competencies).toHaveTextContent("React y TypeScript");
  expect(competencies).toHaveTextContent("Competencia deseable");
  expect(
    screen.getByRole("link", { name: "Volver a vacantes" }),
  ).toHaveAttribute("href", "/job-postings?hu8Demo=listado");
});

it("deduplica las competencias del ejemplo Backend sin mezclar requisitos reales", async () => {
  render(
    <JobPostingDetailPage
      params={{ id: backendId }}
      searchParams={{ hu8Demo: "listado" }}
    />,
  );
  await screen.findByRole("heading", { name: "Desarrollador Backend" });
  expect(
    within(
      screen.getByRole("region", { name: "Competencias requeridas" }),
    ).getAllByRole("listitem"),
  ).toHaveLength(4);
});

it("mantiene el estado de carga y permite elegir otro escenario sin pedir datos reales", () => {
  render(<JobPostingsPage searchParams={{ hu8Demo: "carga" }} />);
  expect(screen.getByRole("status")).toHaveTextContent("Cargando vacantes");
  expect(screen.getByRole("link", { name: "Listado" })).toHaveAttribute(
    "href",
    "/job-postings?hu8Demo=listado",
  );
});

it("permite recuperar el listado después de un error simulado", async () => {
  render(<JobPostingsPage searchParams={{ hu8Demo: "error" }} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Error simulado");
  fireEvent.click(screen.getByRole("button", { name: "Reintentar listado" }));
  expect(
    await screen.findByRole("link", {
      name: "Ver oferta: Desarrollador Frontend Junior",
    }),
  ).toBeInTheDocument();
});

it("permite recuperar el detalle después de un error simulado", async () => {
  render(
    <JobPostingDetailPage
      params={{ id: firstId }}
      searchParams={{ hu8Demo: "error" }}
    />,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("Error simulado");
  fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  expect(
    await screen.findByRole("heading", {
      name: "Desarrollador Frontend Junior",
    }),
  ).toBeInTheDocument();
});

it("muestra vacante inexistente solo dentro de su escenario de demostración", async () => {
  render(
    <JobPostingDetailPage
      params={{ id: firstId }}
      searchParams={{ hu8Demo: "inexistente" }}
    />,
  );
  expect(
    await screen.findByRole("heading", { name: "Vacante no encontrada" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("datos de demostración");
});

it("admite el detalle sin competencias y un listado vacío como estados separados", async () => {
  const { unmount } = render(
    <JobPostingDetailPage
      params={{ id: firstId }}
      searchParams={{ hu8Demo: "sin-requisitos" }}
    />,
  );
  await screen.findByRole("heading", { name: "Desarrollador Frontend Junior" });
  expect(
    screen.getByRole("region", { name: "Competencias requeridas" }),
  ).toHaveTextContent("no requiere conocimientos técnicos");
  unmount();
  render(<JobPostingsPage searchParams={{ hu8Demo: "sin-vacantes" }} />);
  expect(
    await screen.findByRole("heading", { name: "Sin vacantes" }),
  ).toBeInTheDocument();
});

it("consulta por ID de demo únicamente los ejemplos y conserva su navegación", async () => {
  render(<JobPostingsPage searchParams={{ hu8Demo: "listado" }} />);
  fireEvent.click(screen.getByRole("button", { name: "Consultar por ID" }));
  fireEvent.change(screen.getByLabelText("ID de la vacante de demostración"), {
    target: { value: firstId },
  });
  fireEvent.submit(
    screen.getByRole("form", { name: "Consulta por ID de demostración" }),
  );
  expect(screen.getByRole("link", { name: "Ver oferta" })).toHaveAttribute(
    "href",
    demoHref(`/job-postings/${firstId}`, "listado"),
  );
});

it("conserva el modo en la cabecera y no interpreta parámetros desconocidos como demo", () => {
  render(<JobsHeader />);
  for (const link of screen.getAllByRole("link", { name: "Bolsa de trabajo" }))
    expect(link).toHaveAttribute("href", "/job-postings?hu8Demo=listado");
  expect(resolveDemoScenario("desconocido")).toBeNull();
  expect(resolveDemoScenario(["listado", "error"])).toBeNull();
  expect(scenarioHref("/job-postings", "inexistente")).toBe(
    "/job-postings/vacante-inexistente?hu8Demo=inexistente",
  );
});
