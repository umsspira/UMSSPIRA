export const SAFE_CANCEL_DESTINATION = "/";

type CancelEnvironment = {
  historyLength: number;
  referrer: string;
  origin: string;
};

/** Hay un paso previo dentro del propio sitio al cual volver. */
export function canGoBackInsideSite({ historyLength, referrer, origin }: CancelEnvironment): boolean {
  if (historyLength <= 1 || !referrer) return false;
  try {
    return new URL(referrer).origin === origin;
  } catch {
    return false;
  }
}

/** Vuelve atrás si es seguro; si no, lleva a la página de inicio. */
export function leaveCorrection(
  navigate: { back: () => void; push: (path: string) => void },
  env: CancelEnvironment,
): void {
  if (canGoBackInsideSite(env)) {
    navigate.back();
  } else {
    navigate.push(SAFE_CANCEL_DESTINATION);
  }
}