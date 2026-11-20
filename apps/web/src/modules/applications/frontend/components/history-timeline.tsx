import { UserRound } from "lucide-react";
import styles from "./history-timeline.module.css";
import type { ApplicationHistoryEvent } from "../services/applications-board.service";

function actionLabel(event: ApplicationHistoryEvent) {
  switch (event.action) {
    case "ENVIO":
      return event.version > 1 ? "Reenvío" : "Envío inicial";
    case "REENVIO":
      return "Reenvío";
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

export function historyEventTone(event: ApplicationHistoryEvent) {
  if (event.action === "DICTAMEN") {
    const normalize = (value: string) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .trim();
    const title = normalize(event.title);
    const description = normalize(event.description ?? "");
    // Reconocer títulos o prefijos estructurados, no palabras dentro de una nota libre.
    const decision =
      description.match(
        /^(?:DECISION ADMINISTRATIVA|DECISION|DICTAMEN)\s*:\s*(APROBADA|APROBADO|RECHAZADA|RECHAZADO|OBSERVADA|OBSERVADO)\b/,
      )?.[1] ??
      title.match(/^SOLICITUD (APROBADA|RECHAZADA|OBSERVADA)\.?$/)?.[1];
    if (decision?.startsWith("APROBAD")) return "approved";
    if (decision?.startsWith("RECHAZAD")) return "rejected";
    if (decision?.startsWith("OBSERVAD")) return "observed";
    return "review";
  }
  if (event.action === "OCR_ANALISIS") return "ocr";
  if (
    event.action === "REENVIO" ||
    (event.action === "ENVIO" && event.version > 1)
  )
    return "resent";
  return "received";
}

export function HistoryTimeline({
  events,
  loading = false,
  showHeading = true,
}: {
  events: ApplicationHistoryEvent[];
  loading?: boolean;
  showHeading?: boolean;
}) {
  if (loading)
    return (
      <p role="status" className="p-3 text-sm text-[#64707B]">
        Cargando la línea de tiempo…
      </p>
    );
  if (!events.length)
    return (
      <p className="rounded-lg bg-white p-4 text-sm text-[#64707B]">
        Aún no hay acciones registradas en el historial de este expediente.
      </p>
    );

  return (
    <section aria-label="Movimientos del expediente">
      {showHeading && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-[#1B2632]">
            Historial del expediente
          </h3>
          <span className={styles.count}>
            {events.length} movimientos registrados
          </span>
        </div>
      )}
      <p className={styles.zone}>Más recientes primero · Hora de Bolivia</p>
      <ol aria-label="Acciones del expediente" className={styles.timeline}>
        {[...events]
          .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
          .map((event) => (
            <li key={event.id} className={styles.event}>
              <span
                aria-hidden="true"
                className={styles.dot}
                data-tone={historyEventTone(event)}
              />
              <article className={styles.card}>
                <div className={styles.eventHeading}>
                  <h4>{event.title}</h4>
                  <time dateTime={event.occurredAt}>
                    {new Date(event.occurredAt).toLocaleString("es-BO", {
                      timeZone: "America/La_Paz",
                    })}
                  </time>
                </div>
                {event.description && (
                  <p className={styles.description}>{event.description}</p>
                )}
                <div className={styles.meta}>
                  <span className={styles.category}>{actionLabel(event)}</span>
                  <span>
                    Versión {event.version} · {actorLabel(event.actor.type)}
                  </span>
                </div>
                {event.actor.type === "ADMINISTRADOR" && (
                  <div className={styles.author}>
                    <UserRound size={14} aria-hidden="true" />
                    <p>
                      <strong>Dictamen emitido por: </strong>
                      {event.actor.name ||
                        event.actor.email ||
                        (event.actor.id
                          ? `ID ${event.actor.id}`
                          : "Autor no identificado en el registro")}
                      {event.actor.name && event.actor.email && (
                        <span>{event.actor.email}</span>
                      )}
                    </p>
                  </div>
                )}
              </article>
            </li>
          ))}
      </ol>
    </section>
  );
}
