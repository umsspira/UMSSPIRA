import {
  clearAccessToken,
  setAccessToken,
} from "@/shared/services/auth-session";
import { getTechnicalVacancyRequirements as canonicalGet } from "@/shared/services/technical-requirements";
import {
  getTechnicalVacancyRequirements,
  TechnicalRequirementsError,
} from "./technical-requirements";

const id = "cdd89b13-bd3f-45c1-a020-91ca5f3747a5";
const requirement = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  idVacante: id,
  competencia: "SQL",
  nivel: "Avanzado",
  tipo: "Obligatorio",
};
const originalFetch = global.fetch;
const fetchMock = jest.fn();

function respond(body: unknown, status = 200) {
  fetchMock.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock;
  clearAccessToken();
});

afterEach(() => {
  global.fetch = originalFetch;
  clearAccessToken();
});

it("comparte el adaptador canónico con el detalle real", () => {
  expect(getTechnicalVacancyRequirements).toBe(canonicalGet);
});

it("consulta el proxy autenticado con bearer, sin caché y sin envolver data", async () => {
  setAccessToken("test-token");
  respond({ idVacante: id, requisitos: [requirement] });
  const controller = new AbortController();
  await expect(
    getTechnicalVacancyRequirements(` ${id} `, controller.signal),
  ).resolves.toEqual([requirement]);
  expect(fetchMock).toHaveBeenCalledWith(
    `/api/v1/job-postings/${id}/requisitos`,
    expect.objectContaining({
      cache: "no-store",
      signal: controller.signal,
      headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
    }),
  );
});

it("permite la sesión por cookie y acepta una colección vacía confirmada", async () => {
  respond({ idVacante: id, requisitos: [] });
  await expect(getTechnicalVacancyRequirements(id)).resolves.toEqual([]);
  expect(fetchMock).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      credentials: "same-origin",
    }),
  );
});

it.each(["", "vacante/otra?x=1"])(
  "rechaza el ID inválido %p antes de consultar",
  async (value) => {
    await expect(getTechnicalVacancyRequirements(value)).rejects.toMatchObject({
      status: 400,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  },
);

it.each([400, 401, 403, 404, 429, 500, 503])(
  "conserva el estado HTTP %s",
  async (status) => {
    respond({ message: "Error controlado" }, status);
    await expect(getTechnicalVacancyRequirements(id)).rejects.toMatchObject({
      status,
    });
  },
);

it.each([
  { data: { idVacante: id, requisitos: [] } },
  { idVacante: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", requisitos: [] },
  {
    idVacante: id,
    requisitos: [{ ...requirement, idVacante: "otra-vacante" }],
  },
  { idVacante: id, requisitos: [{ ...requirement, competencia: "" }] },
])(
  "rechaza respuestas incompatibles sin sustituirlas por ejemplos: %j",
  async (body) => {
    respond(body);
    await expect(getTechnicalVacancyRequirements(id)).rejects.toBeInstanceOf(
      TechnicalRequirementsError,
    );
  },
);

it("propaga la cancelación y no inicia una consulta cancelada", async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    getTechnicalVacancyRequirements(id, controller.signal),
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(fetchMock).not.toHaveBeenCalled();
});

it("informa un error de red sin devolver datos vacíos o demo", async () => {
  fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
  await expect(getTechnicalVacancyRequirements(id)).rejects.toMatchObject({
    kind: "connection",
  });
});
