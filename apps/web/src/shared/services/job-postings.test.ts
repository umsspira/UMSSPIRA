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
      technicalRequirements: [{
        areaId: "skill-area",
        name: "TypeScript",
        level: "Intermedio",
      }],
    },
  ]);
  expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/job-postings");
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
      requisitosTecnicos: [{
        id: "requirement-1",
        idVacante: "vacancy/1",
        competencia: "TypeScript",
        nivel: "Avanzado",
        tipo: "Obligatorio",
        descripcion: "Experiencia profesional.",
        fechaCreacion: "2026-11-01T00:00:00.000Z",
      }],
      porcentajeAfinidad: null,
      mensajeAfinidad: "No fue posible calcular la afinidad en este momento.",
    }),
  );

  await expect(getJobPosting("vacancy/1")).resolves.toMatchObject({
    id: "vacancy/1",
    affinityPercentage: null,
    affinityMessage: "No fue posible calcular la afinidad en este momento.",
    technicalRequirements: [{
      name: "TypeScript",
      level: "Avanzado",
      type: "Obligatorio",
      description: "Experiencia profesional.",
    }],
  });
  expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/job-postings/vacancy%2F1");
});

it("rechaza un detalle que no corresponde al identificador solicitado", async () => {
  fetchMock.mockResolvedValue(response({
    id: "another-vacancy",
    titulo: "Desarrollador",
    modalidad: null,
    nivelExperiencia: null,
    descripcionTecnica: "Descripción",
    fechaPublicacion: null,
    empresa: null,
    requisitosTecnicos: [],
    porcentajeAfinidad: null,
    mensajeAfinidad: "No disponible",
  }));

  await expect(getJobPosting("vacancy-1")).rejects.toMatchObject({
    name: "ApiError",
    status: 502,
  });
});

it("conserva el 404 del API para distinguir una vacante no disponible", async () => {
  fetchMock.mockResolvedValue(response({ error: "NOT_FOUND" }, 404));

  await expect(getJobPosting("missing")).rejects.toMatchObject({
    name: "ApiError",
    status: 404,
  } satisfies Partial<ApiError>);
});
