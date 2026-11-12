"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import type { RequisitoTecnico } from "@/lib/vacancies/contracts";
import {
  getTechnicalVacancyRequirements,
  TechnicalRequirementsError,
} from "@/shared/services/technical-requirements";
import styles from "./vacancy-detail.module.css";

type RequirementsState = { vacancyId: string; attempt: number } & (
  | { kind: "loading" }
  | { kind: "loaded"; requirements: RequisitoTecnico[] }
  | { kind: "error"; message: string; status?: number }
);

export function TechnicalRequirements({ vacancyId }: { vacancyId: string }) {
  const headingId = useId();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<RequirementsState>({ vacancyId, attempt, kind: "loading" });
  const visibleState: RequirementsState = state.vacancyId === vacancyId && state.attempt === attempt
    ? state : { vacancyId, attempt, kind: "loading" };

  useEffect(() => {
    const controller = new AbortController();
    setState({ vacancyId, attempt, kind: "loading" });

    getTechnicalVacancyRequirements(vacancyId, controller.signal)
      .then((requirements) => {
        if (!controller.signal.aborted) {
          setState({ vacancyId, attempt, kind: "loaded", requirements });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          vacancyId, attempt, kind: "error",
          message: error instanceof TechnicalRequirementsError
            ? error.message : "No se pudieron consultar los requisitos. Intenta nuevamente.",
          status: error instanceof TechnicalRequirementsError ? error.status : undefined,
        });
      });

    return () => controller.abort();
  }, [vacancyId, attempt]);

  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.cardTitle}>Requisitos técnicos de la vacante</h2>
      {visibleState.kind === "loading" && (
        <p role="status" className={styles.bodyText}>Consultando requisitos técnicos...</p>
      )}
      {visibleState.kind === "error" && (
        <div>
          <p role="alert" className={styles.bodyText}>{visibleState.message}</p>
          {![400, 401, 403, 404].includes(visibleState.status ?? 0) && (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => setAttempt((value) => value + 1)}
            >
              Reintentar requisitos
            </button>
          )}
          {visibleState.status === 404 && (
            <Link href="/job-postings" className={styles.secondaryButton}>Volver a vacantes</Link>
          )}
        </div>
      )}
      {visibleState.kind === "loaded" && (
        visibleState.requirements.length === 0 ? (
          <p className={styles.bodyText}>No se registraron requisitos técnicos estructurados para esta vacante.</p>
        ) : (
          <ul className={styles.requirementList}>
            {visibleState.requirements.map((requirement) => (
              <li key={requirement.id} className={styles.requirement}>
                <span className={styles.requirementDot} aria-hidden="true" />
                <div>
                  <strong>{requirement.competencia}</strong>
                  <span className={styles.requirementLevel}>Nivel: {requirement.nivel}</span>
                  <span className={styles.requirementLevel}>Tipo: {requirement.tipo}</span>
                  {requirement.descripcion && <p className={styles.bodyText}>{requirement.descripcion}</p>}
                </div>
              </li>
            ))}
          </ul>
        )
      )}
    </section>
  );
}
