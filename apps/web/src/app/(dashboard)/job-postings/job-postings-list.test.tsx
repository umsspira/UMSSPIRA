import { fireEvent, render, screen, within } from "@testing-library/react";
import { listJobPostings } from "@/shared/services/job-postings";
import { JobPostingsList } from "./job-postings-list";
import { authStore } from "@/modules/auth/frontend/store/auth.store";

jest.mock("@/shared/services/job-postings", () => ({
  listJobPostings: jest.fn(),
}));

const listJobPostingsMock = jest.mocked(listJobPostings);

beforeEach(() => {
  listJobPostingsMock.mockReset();
  authStore.setState({ role: "titulado" });
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
      affinityPercentage: 95,
      company: { name: "Empresa real", description: null, logoUrl: null, bannerUrl: null },
      technicalRequirements: [],
    },
  ]);

  render(<JobPostingsList />);

  const detailLink = await screen.findByRole("link", { name: "Ver oferta" });
  expect(detailLink).toHaveAttribute(
    "href",
    "/job-postings/10000000-0000-4000-8000-000000000001",
  );
});

it("distingue afinidad de cero de una afinidad sin calcular", async () => {
  listJobPostingsMock.mockResolvedValue([
    { id: "zero", title: "Afinidad cero", modality: null, experienceLevel: null, technicalDescription: null, publishedAt: null, affinityPercentage: 0, company: null, technicalRequirements: [] },
    { id: "pending", title: "Pendiente", modality: null, experienceLevel: null, technicalDescription: null, publishedAt: null, affinityPercentage: null, company: null, technicalRequirements: [] },
  ]);

  render(<JobPostingsList />);

  expect(await screen.findByText("0% Afinidad")).toBeInTheDocument();
  expect(screen.getByText("Sin calcular")).toBeInTheDocument();
});

it("filtra recomendadas solo por encima de 50 % y no recomendadas hasta 50 % inclusive", async () => {
  listJobPostingsMock.mockResolvedValue([
    { id: "51", title: "Recomendada", modality: null, experienceLevel: null, technicalDescription: null, publishedAt: null, affinityPercentage: 51, company: null, technicalRequirements: [] },
    { id: "50", title: "Umbral", modality: null, experienceLevel: null, technicalDescription: null, publishedAt: null, affinityPercentage: 50, company: null, technicalRequirements: [] },
    { id: "0", title: "Cero", modality: null, experienceLevel: null, technicalDescription: null, publishedAt: null, affinityPercentage: 0, company: null, technicalRequirements: [] },
    { id: "null", title: "Sin cálculo", modality: null, experienceLevel: null, technicalDescription: null, publishedAt: null, affinityPercentage: null, company: null, technicalRequirements: [] },
  ]);

  render(<JobPostingsList />);
  const filter = await screen.findByRole("group", { name: "Filtrar por afinidad" });

  fireEvent.click(within(filter).getByRole("button", { name: "Recomendadas" }));
  expect(await screen.findByText("Recomendada")).toBeInTheDocument();
  expect(screen.queryByText("Umbral")).not.toBeInTheDocument();
  expect(screen.queryByText("Sin cálculo")).not.toBeInTheDocument();

  fireEvent.click(within(filter).getByRole("button", { name: "No recomendadas" }));
  expect(await screen.findByText("Umbral")).toBeInTheDocument();
  expect(screen.getByText("Cero")).toBeInTheDocument();
  expect(screen.queryByText("Recomendada")).not.toBeInTheDocument();
  expect(screen.queryByText("Sin cálculo")).not.toBeInTheDocument();
});

it("permite ordenar primero las vacantes con menor afinidad", async () => {
  listJobPostingsMock.mockResolvedValue([
    { id: "high", title: "Afinidad alta", modality: null, experienceLevel: null, technicalDescription: null, publishedAt: null, affinityPercentage: 90, company: null, technicalRequirements: [] },
    { id: "low", title: "Afinidad baja", modality: null, experienceLevel: null, technicalDescription: null, publishedAt: null, affinityPercentage: 20, company: null, technicalRequirements: [] },
  ]);
  render(<JobPostingsList />);

  fireEvent.change(await screen.findByLabelText("Ordenar por afinidad"), { target: { value: "asc" } });
  const rows = screen.getAllByRole("row");
  expect(within(rows[1]).getByText("Afinidad baja")).toBeInTheDocument();
});
