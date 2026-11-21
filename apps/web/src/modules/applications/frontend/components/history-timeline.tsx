import type { ApplicationHistoryEvent } from "../services/applications-board.service";

function actionLabel(event: ApplicationHistoryEvent) {
  switch (event.action) {
    case "ENVIO":
      return event.version > 1 ? "Reenvío" : "Envío inicial";
    case "OCR_ANALISIS":
      return "Sugerencia del OCR";
    case "DICTAMEN":
      return "Decisión del administrador";
    default:
      return event.title;
  }
}

function actorLabel(actorType: string) {
  switch (actorType) {
    case "TITULADO":
      return "Titulado";
    case "SISTEMA":
      return "Sistema";
    case "ADMINISTRADOR":
      return "Administrador";
    default:
      return "Actor registrado";
  }
}

export function HistoryTimeline({
  events,
  loading = false,
}: {
  events: ApplicationHistoryEvent[];
  loading?: boolean;
}) {
  if (events.length === 0) {
    return (
      <p className="rounded-lg border border-[#C9C1B1] bg-white p-4 text-sm text-[#2C3B4D]">
        {loading
          ? "Cargando la línea de tiempo…"
          : "Aún no hay acciones registradas en el historial de este expediente."}
      </p>
    );
  }

  return (
    <section aria-labelledby="history-timeline-title">
      <h3 id="history-timeline-title" className="mb-3 text-sm font-bold text-[#1B2632]">
        Línea de tiempo
      </h3>
      <ol aria-label="Acciones del expediente" className="space-y-3">
        {events.map((event) => (
          <li
            key={event.id}
            className="grid gap-2 rounded-lg border border-[#C9C1B1] bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-[#EEE9DF] px-2 py-1 text-xs font-semibold text-[#1B2632]">
                  {actionLabel(event)}
                </span>
                <span className="text-xs text-[#2C3B4D]">
                  Versión {event.version} · {actorLabel(event.actor.type)}
                </span>
              </div>
              {event.description && (
                <p className="mt-2 break-words text-sm text-[#2C3B4D]">
                  {event.description}
                </p>
              )}
            </div>
            <time
              className="text-xs text-[#2C3B4D] sm:text-right"
              dateTime={event.occurredAt}
            >
              {new Date(event.occurredAt).toLocaleString("es-BO", {
                timeZone: "America/La_Paz",
              })}
            </time>
          </li>
        ))}
      </ol>
    </section>
  );
}
