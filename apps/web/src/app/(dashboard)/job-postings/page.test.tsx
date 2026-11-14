jest.mock("next/headers", () => ({
  cookies: () => ({ get: () => undefined }),
}));
jest.mock("@/shared/services/job-postings", () => ({
  listJobPostings: jest.fn().mockResolvedValue([]),
}));

import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { RequisitoTecnico as TechnicalVacancyRequirement } from "@/lib/vacancies/contracts";
import {
  getTechnicalVacancyRequirements,
  TechnicalRequirementsError,
} from "@/modules/job-postings/services/technical-requirements";
import JobPostingsPage from "./page";

jest.mock("@/modules/job-postings/services/technical-requirements", () => ({
  ...jest.requireActual(
    "@/modules/job-postings/services/technical-requirements",
  ),
  getTechnicalVacancyRequirements: jest.fn(),
}));

const getRequirements = jest.mocked(getTechnicalVacancyRequirements);
const vacancyId = "cdd89b13-bd3f-45c1-a020-91ca5f3747a5";

async function renderLookup() {
  const view = render(<JobPostingsPage />);
  await screen.findByText("No hay vacantes disponibles en este momento.");
  fireEvent.click(screen.getByRole("button", { name: "Consultar por ID" }));
  return view;
}

function submit() {
  fireEvent.change(screen.getByRole("textbox", { name: "ID de la vacante" }), {
    target: { value: ` ${vacancyId} ` },
  });
  fireEvent.submit(
    screen.getByRole("form", { name: "Consulta de requisitos técnicos" }),
  );
}

beforeEach(() => getRequirements.mockReset());

it("valida un ID vacío sin llamar al backend", async () => {
  await renderLookup();
  fireEvent.click(screen.getByRole("button", { name: "Consultar" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Ingresa el ID");
  expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  expect(getRequirements).not.toHaveBeenCalled();
});

it("anuncia la carga y muestra todos los campos devueltos por la consulta", async () => {
  let resolve!: (requirements: TechnicalVacancyRequirement[]) => void;
  getRequirements.mockReturnValue(
    new Promise((complete) => {
      resolve = complete;
    }),
  );
  await renderLookup();
  submit();
  expect(screen.getByRole("status")).toHaveTextContent(
    "Consultando requisitos",
  );
  expect(screen.getByRole("button", { name: "Consultando..." })).toBeDisabled();
  expect(screen.getByRole("textbox")).toBeDisabled();

  await act(async () =>
    resolve([
      {
        id: "req-1",
        idVacante: vacancyId,
        competencia: "SQL",
        nivel: "Avanzado",
        tipo: "Obligatorio",
        descripcion: "Consultas relacionales",
      },
    ]),
  );
  expect(screen.getByRole("listitem")).toHaveTextContent("SQL");
  expect(screen.getByRole("listitem")).toHaveTextContent("Avanzado");
  expect(screen.getByRole("listitem")).toHaveTextContent("Obligatorio");
  expect(screen.getByRole("listitem")).toHaveTextContent(
    "Consultas relacionales",
  );
  expect(screen.getByRole("button", { name: "Consultar" })).toBeEnabled();
});

it("muestra un resultado vacío y lo retira al cambiar el ID", async () => {
  getRequirements.mockResolvedValue([]);
  await renderLookup();
  submit();
  expect(
    await screen.findByText(
      "La consulta no devolvió requisitos técnicos para este ID.",
    ),
  ).toHaveAttribute("role", "status");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "otro-id" },
  });
  expect(
    screen.queryByText(/no devolvió requisitos técnicos/),
  ).not.toBeInTheDocument();
});

it("muestra el error HTTP y permite reintentar el mismo ID", async () => {
  getRequirements
    .mockRejectedValueOnce(
      new TechnicalRequirementsError(
        "Verifica la configuración de Supabase.",
        503,
      ),
    )
    .mockResolvedValueOnce([]);
  await renderLookup();
  submit();
  expect(await screen.findByRole("alert")).toHaveTextContent("Error HTTP 503");
  expect(screen.getByRole("alert")).toHaveTextContent("Supabase");
  expect(
    screen.queryByText(/no devolvió requisitos técnicos/),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  expect(
    await screen.findByText(
      "La consulta no devolvió requisitos técnicos para este ID.",
    ),
  ).toHaveAttribute("role", "status");
  expect(getRequirements).toHaveBeenNthCalledWith(
    2,
    vacancyId,
    expect.any(AbortSignal),
  );
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("cancela la consulta al abandonar la pantalla", async () => {
  getRequirements.mockReturnValue(new Promise(() => {}));
  const { unmount } = await renderLookup();
  submit();
  const signal = getRequirements.mock.calls[0][1];
  unmount();
  expect(signal?.aborted).toBe(true);
});
