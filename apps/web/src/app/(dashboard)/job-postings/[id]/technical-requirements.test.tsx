import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { RequisitoTecnico } from "@/lib/vacancies/contracts";
import { getJobPosting, type JobPostingDetail } from "@/shared/services/job-postings";
import {
  getTechnicalVacancyRequirements,
  TechnicalRequirementsError,
} from "@/shared/services/technical-requirements";
import { TechnicalRequirements } from "./technical-requirements";
import { VacancyDetailClient } from "./vacancy-detail-client";

jest.mock("@/shared/services/job-postings", () => ({ getJobPosting: jest.fn() }));
jest.mock("@/shared/services/technical-requirements", () => ({
  ...jest.requireActual("@/shared/services/technical-requirements"),
  getTechnicalVacancyRequirements: jest.fn(),
}));

const getRequirements = jest.mocked(getTechnicalVacancyRequirements);
const getPosting = jest.mocked(getJobPosting);
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const nextId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const requirement: RequisitoTecnico = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", idVacante: id,
  competencia: "PostgreSQL", nivel: "Avanzado", tipo: "Obligatorio",
  descripcion: "Modelado de datos.",
};
const posting: JobPostingDetail = {
  id, title: "Desarrollo frontend", modality: "REMOTO", experienceLevel: "Junior",
  technicalDescription: "Descripción de la oferta.", publishedAt: null,
  company: { name: "Empresa", description: "Sobre la empresa.", logoUrl: null, bannerUrl: null },
  technicalRequirements: [{ name: "React", level: "Intermedio" }],
  affinityPercentage: 95,
};

beforeEach(() => {
  getRequirements.mockReset().mockResolvedValue([requirement]);
  getPosting.mockReset().mockResolvedValue(posting);
});

it("integra HU8 en el detalle conservando empresa, afinidad y habilidades de HU12 separadas", async () => {
  render(<VacancyDetailClient id={id} isGraduate />);

  expect(await screen.findByText("PostgreSQL")).toBeInTheDocument();
  const structured = screen.getByRole("region", { name: "Requisitos técnicos de la vacante" });
  expect(within(structured).getByText("Nivel: Avanzado")).toBeInTheDocument();
  expect(within(structured).getByText("Tipo: Obligatorio")).toBeInTheDocument();
  expect(within(structured).getByText("Modelado de datos.")).toBeInTheDocument();
  expect(within(structured).queryByText("React")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Habilidades para el cálculo de afinidad" })).toBeInTheDocument();
  expect(screen.getByText("React")).toBeInTheDocument();
  expect(screen.getByText(/95\s*%/)).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Empresa empleadora" })).toBeInTheDocument();
  expect(getRequirements).toHaveBeenCalledWith(id, expect.any(AbortSignal));
});

it("espera a cargar la vacante oficial antes de consultar requisitos", () => {
  getPosting.mockImplementation(() => new Promise(() => {}));
  render(<VacancyDetailClient id={id} isGraduate />);
  expect(screen.getByRole("status")).toHaveTextContent("Cargando detalle de la vacante");
  expect(getRequirements).not.toHaveBeenCalled();
});

it("muestra carga y cancela la solicitud cuando se desmonta", () => {
  getRequirements.mockImplementation(() => new Promise(() => {}));
  const { unmount } = render(<TechnicalRequirements vacancyId={id} />);
  expect(screen.getByRole("status")).toHaveTextContent("Consultando requisitos técnicos");
  const signal = getRequirements.mock.calls[0][1];
  unmount();
  expect(signal?.aborted).toBe(true);
});

it("distingue un resultado vacío de HU2 de las habilidades existentes de HU12", async () => {
  getRequirements.mockResolvedValue([]);
  render(<VacancyDetailClient id={id} isGraduate />);
  expect(await screen.findByText("No se registraron requisitos técnicos estructurados para esta vacante.")).toBeInTheDocument();
  expect(screen.getByText("React")).toBeInTheDocument();
  expect(screen.getByText(/95\s*%/)).toBeInTheDocument();
});

it("muestra HU2 aunque no existan habilidades de afinidad en HU12", async () => {
  getPosting.mockResolvedValue({ ...posting, technicalRequirements: [], affinityPercentage: null });
  render(<VacancyDetailClient id={id} isGraduate />);

  expect(await screen.findByText("PostgreSQL")).toBeInTheDocument();
  expect(screen.getByText("No se registraron habilidades para el cálculo de afinidad.")).toBeInTheDocument();
  expect(screen.getByText("Afinidad no calculada")).toBeInTheDocument();
});

it("conserva HU8 para otros usuarios autenticados sin mostrar la tarjeta de afinidad", async () => {
  render(<VacancyDetailClient id={id} isGraduate={false} />);

  expect(await screen.findByText("PostgreSQL")).toBeInTheDocument();
  expect(screen.queryByText(/95\s*%/)).not.toBeInTheDocument();
  expect(screen.getByText("React")).toBeInTheDocument();
});

it.each([400, 401, 403, 404, 500, 503, undefined])(
  "muestra el error %s sin datos ficticios ni un mensaje de resultado vacío", async (status) => {
    getRequirements.mockRejectedValue(new TechnicalRequirementsError("No se pudo realizar la consulta.", status));
    render(<TechnicalRequirements vacancyId={id} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo realizar la consulta.");
    expect(screen.queryByText("PostgreSQL")).not.toBeInTheDocument();
    expect(screen.queryByText(/No se registraron requisitos/)).not.toBeInTheDocument();
    if ([400, 401, 403, 404].includes(status ?? 0)) {
      expect(screen.queryByRole("button", { name: "Reintentar requisitos" })).not.toBeInTheDocument();
    } else {
      expect(screen.getByRole("button", { name: "Reintentar requisitos" })).toBeInTheDocument();
    }
    if (status === 404) {
      expect(screen.getByRole("link", { name: "Volver a vacantes" })).toHaveAttribute("href", "/job-postings");
    }
  },
);

it("permite recuperar los requisitos tras un error temporal sin recargar el detalle", async () => {
  getRequirements.mockRejectedValueOnce(new TechnicalRequirementsError("Error temporal", 503))
    .mockResolvedValueOnce([requirement]);
  render(<VacancyDetailClient id={id} isGraduate />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Error temporal");
  expect(screen.getByText(/95\s*%/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Reintentar requisitos" }));
  expect(await screen.findByText("PostgreSQL")).toBeInTheDocument();
  expect(getRequirements).toHaveBeenCalledTimes(2);
  expect(getPosting).toHaveBeenCalledTimes(1);
});

it("descarta una respuesta tardía de otra vacante y cancela su solicitud", async () => {
  let resolveFirst!: (requirements: RequisitoTecnico[]) => void;
  getRequirements.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
    .mockResolvedValueOnce([{ ...requirement, idVacante: nextId, competencia: "Linux" }]);
  const { rerender } = render(<TechnicalRequirements vacancyId={id} />);
  const firstSignal = getRequirements.mock.calls[0][1];

  rerender(<TechnicalRequirements vacancyId={nextId} />);
  expect(firstSignal?.aborted).toBe(true);
  expect(await screen.findByText("Linux")).toBeInTheDocument();
  await act(async () => { resolveFirst([requirement]); });
  expect(screen.queryByText("PostgreSQL")).not.toBeInTheDocument();
  expect(screen.getByText("Linux")).toBeInTheDocument();
  await waitFor(() => expect(getRequirements).toHaveBeenCalledTimes(2));
});
