import {
  normalizeVacancyStatus,
  vacancyLifecycleErrorMessage,
  VACANCY_STATUS_LABEL,
} from "./vacancy-status";

describe("vacancy-status", () => {
  it.each([
    ["PUBLICADO", "ACTIVA"],
    ["publicada", "ACTIVA"],
    ["ACTIVO", "ACTIVA"],
    ["PAUSADO", "PAUSADA"],
    ["PAUSADA", "PAUSADA"],
    ["CERRADO", "CERRADA"],
    ["cerrada", "CERRADA"],
    ["BORRADOR", "BORRADOR"],
    [null, "BORRADOR"],
    [undefined, "BORRADOR"],
  ])("normaliza %s → %s", (raw, expected) => {
    expect(normalizeVacancyStatus(raw)).toBe(expected);
  });

  it("usa un único texto por estado", () => {
    expect(VACANCY_STATUS_LABEL.ACTIVA).toBe("Activa");
    expect(VACANCY_STATUS_LABEL.PAUSADA).toBe("Pausada");
    expect(VACANCY_STATUS_LABEL.CERRADA).toBe("Cerrada");
  });

  it("explica el error según el código HTTP", () => {
    expect(vacancyLifecycleErrorMessage(403, "cerrar")).toMatch(/permiso/);
    expect(vacancyLifecycleErrorMessage(404, "cerrar")).toMatch(/empresa/);
    expect(vacancyLifecycleErrorMessage(409, "eliminar")).toMatch(/postulantes/);
    expect(vacancyLifecycleErrorMessage(500, "pausar")).toMatch(/pausar/);
  });
});