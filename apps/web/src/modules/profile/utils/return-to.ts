// Destino de regreso recibido por URL (por ejemplo returnTo=/afinidad desde la Épica 3).
// Solo se aceptan rutas internas para no redirigir a otro sitio (evita open redirect)
export function rutaDeRegreso(valor: string | undefined): string | undefined {
  if (!valor || !valor.startsWith('/') || valor.startsWith('//') || valor.startsWith('/\\')) return undefined;
  return valor;
}

// Inicio del egresado: destino de «Volver» solo cuando no hay pantalla anterior a la que regresar
export const INICIO_PATH = '/portal';

type HistoryRouter = { back: () => void; push: (href: string) => void };

// «Volver» sin returnTo regresa a la última pantalla visitada (por ejemplo, la de editar).
// Si la pestaña se abrió directo en esta pantalla no hay historial y se va al Inicio
export function volverALaPantallaAnterior(
  router: HistoryRouter,
  historyLength: number = typeof window === 'undefined' ? 0 : window.history.length,
): void {
  if (historyLength > 1) {
    router.back();
    return;
  }
  router.push(INICIO_PATH);
}
