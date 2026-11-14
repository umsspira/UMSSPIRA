import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { cookies } from "next/headers";
import { listJobPostings, getJobPosting } from "@/shared/services/job-postings";
import { getTechnicalVacancyRequirements } from "@/shared/services/technical-requirements";
import JobPostingsPage from "./page";
import JobPostingDetailPage from "./[id]/page";
import JobPostingsLayout from "./layout";

jest.mock("next/headers", () => ({ cookies: jest.fn() }));
jest.mock("@/shared/services/job-postings", () => ({
  listJobPostings: jest.fn(),
  getJobPosting: jest.fn(),
}));
jest.mock("@/shared/services/technical-requirements", () => ({
  ...jest.requireActual("@/shared/services/technical-requirements"),
  getTechnicalVacancyRequirements: jest.fn(),
}));

const id = "10000000-0000-4000-8000-000000000001";
const posting = {
  id,
  title: "Backend real",
  modality: "REMOTO",
  experienceLevel: null,
  technicalDescription: "Oferta del backend",
  publishedAt: null,
  company: null,
  technicalRequirements: [{ name: "React", level: null }],
  affinityPercentage: 0,
};

beforeEach(() => {
  jest.mocked(cookies).mockReturnValue({
    get: () => ({ value: "titulado" }),
  } as unknown as ReturnType<typeof cookies>);
  jest.mocked(listJobPostings).mockReset().mockResolvedValue([posting]);
  jest.mocked(getJobPosting).mockReset().mockResolvedValue(posting);
  jest
    .mocked(getTechnicalVacancyRequirements)
    .mockReset()
    .mockResolvedValue([]);
});

it("combina consulta por ID, listado real, navegación y afinidad cero", async () => {
  render(<JobPostingsPage />);
  expect(
    await screen.findByRole("heading", { name: "Backend real" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  fireEvent.click(screen.getByRole("button", { name: "Consultar por ID" }));
  const input = screen.getByRole("textbox", { name: "ID de la vacante" });
  expect(input).toHaveFocus();
  fireEvent.change(input, { target: { value: id } });
  fireEvent.click(screen.getByRole("button", { name: "Consultar" }));
  expect(
    await screen.findByRole("link", { name: "Ver oferta" }),
  ).toHaveAttribute("href", `/job-postings/${id}`);
  expect(getTechnicalVacancyRequirements).toHaveBeenCalledWith(
    id,
    expect.any(AbortSignal),
  );
  fireEvent.keyDown(input, { key: "Escape" });
  expect(
    screen.getByRole("button", { name: "Consultar por ID" }),
  ).toHaveFocus();
});

it.each(["desconocido", ["listado", "error"]])(
  "conserva modo real para hu8Demo=%j",
  async (value) => {
    render(<JobPostingsPage searchParams={{ hu8Demo: value }} />);
    await screen.findByRole("heading", { name: "Backend real" });
    expect(
      screen.queryByRole("region", { name: "Modo demostración" }),
    ).not.toBeInTheDocument();
  },
);

it("usa VacancyDetailClient y separa los requisitos canónicos de las habilidades HU10", async () => {
  render(<JobPostingDetailPage params={{ id }} />);
  await screen.findByRole("heading", { name: "Backend real" });
  expect(screen.getByText("React")).toBeInTheDocument();
  expect(screen.getByText("0 %")).toBeInTheDocument();
  await waitFor(() =>
    expect(getTechnicalVacancyRequirements).toHaveBeenCalledWith(
      id,
      expect.any(AbortSignal),
    ),
  );
  expect(screen.getByRole("main")).toHaveAttribute("id", "hu8-main");
  expect(
    screen.getByRole("link", { name: "Activar demostración" }),
  ).toBeInTheDocument();
});

it("respeta el rol al componer listado y detalle", async () => {
  jest.mocked(cookies).mockReturnValue({
    get: () => ({ value: "empresa" }),
  } as unknown as ReturnType<typeof cookies>);
  const { unmount } = render(<JobPostingsPage />);
  await screen.findByRole("heading", { name: "Backend real" });
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  unmount();
  render(<JobPostingDetailPage params={{ id }} />);
  await screen.findByRole("heading", { name: "Backend real" });
  expect(
    screen.queryByRole("region", { name: "Afinidad con esta vacante" }),
  ).not.toBeInTheDocument();
});

it("no duplica la cabecera del dashboard en el layout de vacantes", () => {
  render(
    <JobPostingsLayout>
      <main id="hu8-main">Contenido</main>
    </JobPostingsLayout>,
  );
  expect(screen.queryByRole("banner")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Ir al contenido" })).toHaveAttribute(
    "href",
    "#hu8-main",
  );
});
