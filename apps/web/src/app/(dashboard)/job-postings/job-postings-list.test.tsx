import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { listJobPostings } from "@/shared/services/job-postings";
import { JobPostingsList } from "./job-postings-list";

jest.mock("@/shared/services/job-postings", () => ({
  listJobPostings: jest.fn(),
}));

const listJobPostingsMock = jest.mocked(listJobPostings);

beforeEach(() => {
  listJobPostingsMock.mockReset();
});

it("busca, pagina incluso con huecos y vuelve al listado sin búsqueda", async () => {
  listJobPostingsMock.mockResolvedValue([]);
  render(<JobPostingsList isGraduate />);
  await screen.findByText("No hay vacantes disponibles en este momento.");
  fireEvent.change(
    screen.getByRole("searchbox", { name: "Buscar por título o empresa" }),
    {
      target: { value: "  Backend  " },
    },
  );
  fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
  await waitFor(() =>
    expect(listJobPostingsMock).toHaveBeenLastCalledWith({
      search: "Backend",
      page: 1,
    }),
  );
  await screen.findByText("No se encontraron vacantes en esta página.");
  fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
  await waitFor(() =>
    expect(listJobPostingsMock).toHaveBeenLastCalledWith({
      search: "Backend",
      page: 2,
    }),
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Anterior" })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
  await waitFor(() =>
    expect(listJobPostingsMock).toHaveBeenLastCalledWith({
      search: "Backend",
      page: 1,
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));
  await waitFor(() => expect(listJobPostingsMock).toHaveBeenLastCalledWith());
  expect(
    screen.queryByRole("navigation", { name: "Paginación de vacantes" }),
  ).not.toBeInTheDocument();
});

it("conserva el enlace al detalle y la afinidad del resultado de búsqueda", async () => {
  listJobPostingsMock.mockResolvedValueOnce([]).mockResolvedValue([
    {
      id: "10000000-0000-4000-8000-000000000001",
      title: "Backend oficial",
      modality: null,
      experienceLevel: null,
      technicalDescription: null,
      publishedAt: null,
      company: null,
      technicalRequirements: [],
      affinityPercentage: 100,
    },
  ]);
  render(<JobPostingsList isGraduate />);
  await screen.findByText("No hay vacantes disponibles en este momento.");
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "Backend" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
  expect(
    await screen.findByRole("link", { name: "Ver detalle" }),
  ).toHaveAttribute(
    "href",
    "/job-postings/10000000-0000-4000-8000-000000000001",
  );
  expect(screen.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "100",
  );
});

it("navega al detalle usando el identificador real de la vacante del API", async () => {
  listJobPostingsMock.mockResolvedValue([
    {
      id: "10000000-0000-4000-8000-000000000001",
      title: "Desarrolladora frontend",
      modality: "REMOTO",
      experienceLevel: "Junior",
      technicalDescription: "Descripción real de la oferta.",
      publishedAt: null,
      company: {
        name: "Empresa real",
        description: null,
        logoUrl: null,
        bannerUrl: null,
      },
      technicalRequirements: [],
      affinityPercentage: 72,
    },
  ]);

  render(<JobPostingsList isGraduate />);

  const detailLink = await screen.findByRole("link", { name: "Ver detalle" });
  expect(detailLink).toHaveAttribute(
    "href",
    "/job-postings/10000000-0000-4000-8000-000000000001",
  );
  expect(
    screen.getByRole("progressbar", {
      name: "Afinidad para Desarrolladora frontend",
    }),
  ).toHaveAttribute("aria-valuenow", "72");
  expect(screen.getByText("72 %")).toBeInTheDocument();
});

it("identifica las vacantes sin cálculo y conserva la correspondencia de los porcentajes", async () => {
  listJobPostingsMock.mockResolvedValue([
    {
      id: "vacancy-1",
      title: "Vacante evaluada",
      modality: null,
      experienceLevel: null,
      technicalDescription: null,
      publishedAt: null,
      company: {
        name: "Empresa A",
        description: null,
        logoUrl: null,
        bannerUrl: null,
      },
      technicalRequirements: [],
      affinityPercentage: 0,
    },
    {
      id: "vacancy-2",
      title: "Vacante sin cálculo",
      modality: null,
      experienceLevel: null,
      technicalDescription: null,
      publishedAt: null,
      company: {
        name: "Empresa B",
        description: null,
        logoUrl: null,
        bannerUrl: null,
      },
      technicalRequirements: [],
      affinityPercentage: null,
    },
  ]);

  render(<JobPostingsList isGraduate />);

  const cards = await screen.findAllByRole("listitem");
  expect(within(cards[0]).getByText("0 %")).toBeInTheDocument();
  expect(within(cards[0]).getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "0",
  );
  expect(
    within(cards[1]).getByText("Afinidad no calculada para esta vacante."),
  ).toBeInTheDocument();
  expect(within(cards[1]).queryByRole("progressbar")).not.toBeInTheDocument();
  expect(within(cards[1]).queryByText(/%/)).not.toBeInTheDocument();
});

it("no muestra afinidad a otros roles y permite volver a consultar el listado", async () => {
  listJobPostingsMock.mockResolvedValue([]);

  render(<JobPostingsList isGraduate={false} />);

  expect(
    await screen.findByText("No hay vacantes disponibles en este momento."),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Actualizar lista" }),
  ).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Actualizar lista" }));
  await waitFor(() => expect(listJobPostingsMock).toHaveBeenCalledTimes(2));
  expect(screen.queryByText("Afinidad con tu perfil")).not.toBeInTheDocument();
});

it("no muestra porcentajes cuando falla la consulta de vacantes", async () => {
  listJobPostingsMock.mockRejectedValue(new Error("Error de conexión"));

  render(<JobPostingsList isGraduate />);

  expect(
    await screen.findByText("No pudimos cargar las vacantes"),
  ).toBeInTheDocument();
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  expect(screen.queryByText(/%/)).not.toBeInTheDocument();
});
