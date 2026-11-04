import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  VACANCY_STRUCTURE_VALIDATION_PATH,
  VacancyStructureApiError,
  VacancyStructureClient,
} from "./client.ts";
import type { ValidateVacancyStructureRequest } from "./contracts";

const validVacancy: ValidateVacancyStructureRequest = {
  id: "11111111-1111-4111-8111-111111111111",
  titulo: "Desarrollador Backend",
  idEmpresa: "22222222-2222-4222-8222-222222222222",
  estado: "Publicada",
  requisitosTecnicos: {
    requerimientoLaboralIds: [
      "33333333-3333-4333-8333-333333333333",
    ],
  },
};

describe("VacancyStructureClient (HU1)", () => {
  it("envía el contrato canónico al endpoint de HU1", async () => {
    const client = new VacancyStructureClient({
      baseUrl: "http://localhost:3001/",
      fetcher: async (input, init) => {
        assert.equal(
          String(input),
          `http://localhost:3001${VACANCY_STRUCTURE_VALIDATION_PATH}`,
        );
        assert.equal(init?.method, "POST");
        assert.equal(
          (init?.headers as Record<string, string>)["Content-Type"],
          "application/json",
        );
        assert.deepEqual(JSON.parse(String(init?.body)), validVacancy);

        return Response.json({ valida: true, vacante: validVacancy });
      },
    });

    assert.deepEqual(await client.validate(validVacancy), {
      valida: true,
      vacante: validVacancy,
    });
  });

  it("propaga los detalles de validación del backend", async () => {
    const client = new VacancyStructureClient({
      fetcher: async () =>
        Response.json(
          { message: ["id debe ser un UUID válido."] },
          { status: 400 },
        ),
    });

    await assert.rejects(
      () => client.validate(validVacancy),
      (error: unknown) => {
        assert.ok(error instanceof VacancyStructureApiError);
        assert.equal(error.status, 400);
        assert.deepEqual(error.details, ["id debe ser un UUID válido."]);
        return true;
      },
    );
  });

  it("rechaza respuestas exitosas incompatibles con el contrato", async () => {
    const client = new VacancyStructureClient({
      fetcher: async () => Response.json({ valida: true }),
    });

    await assert.rejects(
      () => client.validate(validVacancy),
      (error: unknown) => {
        assert.ok(error instanceof VacancyStructureApiError);
        assert.deepEqual(error.details, [
          "El backend devolvió una respuesta de validación no reconocida.",
        ]);
        return true;
      },
    );
  });

  it("convierte los errores de red en un error tipado", async () => {
    const client = new VacancyStructureClient({
      fetcher: async () => {
        throw new TypeError("fetch failed");
      },
    });

    await assert.rejects(
      () => client.validate(validVacancy),
      (error: unknown) => {
        assert.ok(error instanceof VacancyStructureApiError);
        assert.equal(error.status, undefined);
        assert.deepEqual(error.details, [
          "No se pudo conectar con el backend de validación.",
        ]);
        return true;
      },
    );
  });

  it("valida sin acceder a almacenamiento local", async () => {
    let storageAccessed = false;
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        storageAccessed = true;
        throw new Error("El cliente no debe acceder a localStorage.");
      },
    });

    try {
      const client = new VacancyStructureClient({
        fetcher: async () =>
          Response.json({ valida: true, vacante: validVacancy }),
      });

      await client.validate(validVacancy);
      assert.equal(storageAccessed, false);
    } finally {
      delete (globalThis as { localStorage?: Storage }).localStorage;
    }
  });
});
