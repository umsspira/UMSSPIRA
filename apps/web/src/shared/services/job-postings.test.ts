import { clearAccessToken, setAccessToken } from "./auth-session";
import { ApiError } from "./api-client";
import { getJobPosting, listJobPostings } from "./job-postings";

const originalFetch = global.fetch;
const fetchMock = jest.fn();

function response(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ data }),
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock;
  setAccessToken("test-token");
});

afterEach(() => {
  global.fetch = originalFetch;
  clearAccessToken();
});

it("envía texto y paginación codificados sin cambiar la respuesta del listado", async () => {
  fetchMock.mockResolvedValue(response([]));
  await expect(listJobPostings({ search: "  Backend & Empresa  ", page: 2, limit: 5 }))
    .resolves.toEqual([]);
  expect(fetchMock.mock.calls[0][0]).toBe(
    "/api/v1/job-postings?search=Backend+%26+Empresa&page=2&limit=5",
  );
});

it("mantiene la ruta original sin búsqueda aunque se reciban opciones de paginación", async () => {
  fetchMock.mockResolvedValue(response([]));
  await listJobPostings({ search: "   ", page: 2 });
  expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/job-postings");
});

it("lista las vacantes publicadas usando los datos que devuelve el API", async () => {
  fetchMock.mockResolvedValue(
    response([
      {
        id: "vacancy-1",
        titulo: "Desarrollador",
        modalidad: "REMOTO",
        nivelExperiencia: "Junior",
        descripcionTecnica: "Descripción real",
        fechaPublicacion: null,
        empresa: { razonSocial: "Empresa real", descripcion: null, logoUrl: null, bannerUrl: null },
        porcentajeAfinidad: 82.5,
        requisitosTecnicos: [{
          areaId: "skill-area",
          nombre: "TypeScript",
          nivel: "Intermedio",
        }],
      },
    ]),
  );

  await expect(listJobPostings()).resolves.toMatchObject([
    {
      id: "vacancy-1",
      title: "Desarrollador",
      company: { name: "Empresa real" },
      affinityPercentage: 82.5,
      technicalRequirements: [{
        areaId: "skill-area",
        name: "TypeScript",
        level: "Intermedio",
      }],
    },
  ]);
  expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/job-postings");
});

it("preserves zero as a calculated score and null as an unavailable calculation", async () => {
  fetchMock.mockResolvedValue(
    response([
      {
        id: "vacancy-1",
        titulo: "Evaluada",
        modalidad: null,
        nivelExperiencia: null,
        descripcionTecnica: null,
        fechaPublicacion: null,
        empresa: null,
        requisitosTecnicos: [],
        porcentajeAfinidad: 0,
      },
      {
        id: "vacancy-2",
        titulo: "Sin cálculo",
        modalidad: null,
        nivelExperiencia: null,
        descripcionTecnica: null,
        fechaPublicacion: null,
        empresa: null,
        requisitosTecnicos: [],
        porcentajeAfinidad: null,
      },
    ]),
  );

  await expect(listJobPostings()).resolves.toMatchObject([
    { id: "vacancy-1", affinityPercentage: 0 },
    { id: "vacancy-2", affinityPercentage: null },
  ]);
});

it("obtiene el detalle por identificador y preserva una afinidad inexistente como null", async () => {
  fetchMock.mockResolvedValue(
    response({
      id: "vacancy/1",
      titulo: "Desarrollador",
      modalidad: null,
      nivelExperiencia: null,
      descripcionTecnica: "Descripción",
      fechaPublicacion: null,
      empresa: null,
      requisitosTecnicos: [],
      porcentajeAfinidad: null,
    }),
  );

  await expect(getJobPosting("vacancy/1")).resolves.toMatchObject({
    id: "vacancy/1",
    affinityPercentage: null,
  });
  expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/job-postings/vacancy%2F1");
});

it("conserva el 404 del API para distinguir una vacante no disponible", async () => {
  fetchMock.mockResolvedValue(response({ error: "NOT_FOUND" }, 404));

  await expect(getJobPosting("missing")).rejects.toMatchObject({
    name: "ApiError",
    status: 404,
  } satisfies Partial<ApiError>);
});
