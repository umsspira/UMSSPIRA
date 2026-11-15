import { canGoBackInsideSite, leaveCorrection } from "./cancel-destination";

const origin = "https://umsspira.test";

describe("leaveCorrection", () => {
  it("vuelve atrás cuando venía de otra página del mismo sitio", () => {
    const navigate = { back: jest.fn(), push: jest.fn() };
    leaveCorrection(navigate, { historyLength: 3, referrer: `${origin}/login`, origin });
    expect(navigate.back).toHaveBeenCalledTimes(1);
    expect(navigate.push).not.toHaveBeenCalled();
  });

  it("va al inicio cuando se abrió desde el correo en una pestaña nueva", () => {
    const navigate = { back: jest.fn(), push: jest.fn() };
    leaveCorrection(navigate, { historyLength: 1, referrer: "", origin });
    expect(navigate.push).toHaveBeenCalledWith("/");
    expect(navigate.back).not.toHaveBeenCalled();
  });

  it("va al inicio si la página anterior es de otro sitio", () => {
    const navigate = { back: jest.fn(), push: jest.fn() };
    leaveCorrection(navigate, { historyLength: 4, referrer: "https://mail.google.com/", origin });
    expect(navigate.push).toHaveBeenCalledWith("/");
    expect(navigate.back).not.toHaveBeenCalled();
  });

  it("trata un referrer inválido como sin historial", () => {
    expect(canGoBackInsideSite({ historyLength: 3, referrer: "no-es-url", origin })).toBe(false);
  });
});