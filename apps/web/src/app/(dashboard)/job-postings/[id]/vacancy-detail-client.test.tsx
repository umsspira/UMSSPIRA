import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApiError } from "@/shared/services/api-client";
import { getJobPosting } from "@/shared/services/job-postings";
import { VacancyDetailClient } from "./vacancy-detail-client";

jest.mock("@/shared/services/job-postings", () => ({
  getJobPosting: jest.fn(),
}));

const getJobPostingMock = jest.mocked(getJobPosting);
const originalConsoleError = console.error;

const posting = {
  id: "vacancy-1",
  title: "Desarrolladora frontend",
  modality: "REMOTO",
  experienceLevel: "Junior",
  technicalDescription: "Descripción registrada de la vacante.",
  publishedAt: null,
  company: {
    name: "Empresa real",
    description: "Descripción real de la empresa.",
    logoUrl: null,
    bannerUrl: null,
  },
  technicalRequirements: [{
    id: "requirement-1",
    vacancyId: "vacancy-1",
    name: "React",
    level: "Intermedio",
    type: "Obligatorio",
    description: "Desarrollo de interfaces.",
  }],
  affinityPercentage: 95,
  affinityMessage: null,
};

beforeEach(() => {
  getJobPostingMock.mockReset();
  console.error = jest.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
});

it("muestra el detalle, los requisitos HU8 y la afinidad disponible", async () => {
  getJobPostingMock.mockResolvedValue(posting);

  render(<VacancyDetailClient id="vacancy-1" isGraduate />);

  expect(await screen.findByRole("heading", { name: "Desarrolladora frontend" })).toBeInTheDocument();
  expect(screen.getAllByText("Empresa real")).toHaveLength(3);
  expect(screen.getByText("Descripción registrada de la vacante.")).toBeInTheDocument();
  expect(screen.getByText("React")).toBeInTheDocument();
  expect(screen.getByText("Competencias requeridas")).toBeInTheDocument();
  expect(screen.getByText("Tipo: Obligatorio")).toBeInTheDocument();
  expect(screen.getByText(/95\s*%/)).toBeInTheDocument();
});

it("indica que la afinidad no está calculada sin mostrar un porcentaje sustituto", async () => {
  getJobPostingMock.mockResolvedValue({
    ...posting,
    affinityPercentage: null,
    affinityMessage: "No fue posible calcular la afinidad en este momento.",
  });

  render(<VacancyDetailClient id="vacancy-1" isGraduate />);

  expect(await screen.findByText("Afinidad no calculada")).toBeInTheDocument();
  expect(screen.getByText("No fue posible calcular la afinidad en este momento.")).toBeInTheDocument();
  expect(screen.queryByText("0 %")).not.toBeInTheDocument();
});

it("muestra un cero solo cuando el API devuelve ese porcentaje calculado", async () => {
  getJobPostingMock.mockResolvedValue({ ...posting, affinityPercentage: 0 });

  render(<VacancyDetailClient id="vacancy-1" isGraduate />);

  expect(await screen.findByText(/0\s*%/)).toBeInTheDocument();
  expect(screen.queryByText("Afinidad no calculada")).not.toBeInTheDocument();
});

it("no muestra la tarjeta de afinidad para actores que no son titulados", async () => {
  getJobPostingMock.mockResolvedValue(posting);

  render(<VacancyDetailClient id="vacancy-1" isGraduate={false} />);

  expect(await screen.findByRole("heading", { name: "Desarrolladora frontend" })).toBeInTheDocument();
  expect(screen.queryByLabelText("Tu afinidad con esta vacante")).not.toBeInTheDocument();
});

it("muestra el estado de vacante no disponible cuando el API responde 404", async () => {
  getJobPostingMock.mockRejectedValue(new ApiError(404, "No disponible"));

  render(<VacancyDetailClient id="missing" isGraduate />);

  expect(
    await screen.findByRole("heading", { name: "Esta vacante ya no está disponible" }),
  ).toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: /Volver a vacantes/ })).toHaveLength(1);
});

it("muestra el estado de error y permite reintentar la consulta", async () => {
  getJobPostingMock
    .mockRejectedValueOnce(new ApiError(503, "Error temporal"))
    .mockResolvedValueOnce(posting);

  render(<VacancyDetailClient id="vacancy-1" isGraduate />);

  expect(
    await screen.findByRole("heading", { name: "No pudimos cargar el detalle de la vacante" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

  await waitFor(() => {
    expect(getJobPostingMock).toHaveBeenCalledTimes(2);
  });
  expect(await screen.findByRole("heading", { name: "Desarrolladora frontend" })).toBeInTheDocument();
});

it("no muestra el detalle anterior mientras carga otro identificador", async () => {
  let resolveNext: ((value: typeof posting) => void) | undefined;
  getJobPostingMock
    .mockResolvedValueOnce(posting)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveNext = resolve;
        }),
    );

  const { rerender } = render(<VacancyDetailClient id="vacancy-1" isGraduate />);
  expect(await screen.findByRole("heading", { name: "Desarrolladora frontend" })).toBeInTheDocument();

  rerender(<VacancyDetailClient id="vacancy-2" isGraduate />);

  expect(await screen.findByRole("status")).toHaveTextContent(
    "Cargando detalle de la vacante...",
  );
  expect(
    screen.queryByRole("heading", { name: "Desarrolladora frontend" }),
  ).not.toBeInTheDocument();
  resolveNext?.({ ...posting, id: "vacancy-2", title: "Desarrollador backend" });
  expect(
    await screen.findByRole("heading", { name: "Desarrollador backend" }),
  ).toBeInTheDocument();
});
