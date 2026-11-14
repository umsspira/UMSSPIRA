"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CircleAlert,
  FileText,
  RefreshCw,
  Search,
} from "lucide-react";
import { useTechnicalRequirements } from "../hooks/use-technical-requirements";

export default function RequirementsConsultation({
  id,
  linkToDetail = false,
}: {
  id?: string;
  linkToDetail?: boolean;
}) {
  const [vacancyId, setVacancyId] = useState("");
  const { state, validationError, consult, reset } =
    useTechnicalRequirements(id);
  const loading = state.status === "loading";

  return (
    <section
      id="consulta-requisitos"
      className={`hu8-detail-card hu8-consultation${id === undefined ? " hu8-consultation-lookup" : ""}`}
      aria-labelledby="technical-requirements-heading"
    >
      <h2 id="technical-requirements-heading">
        <FileText size={18} aria-hidden="true" />
        Competencias requeridas
      </h2>
      {id === undefined && (
        <>
          <p className="hu8-detail-muted">
            Consulta los requisitos técnicos de una vacante disponible mediante
            su ID.
          </p>
          <form
            className="hu8-consultation-form"
            aria-label="Consulta de requisitos técnicos"
            onSubmit={(event) => {
              event.preventDefault();
              void consult(vacancyId);
            }}
          >
            <div className="hu8-consultation-input">
              <label htmlFor="vacancy-id" className="hu8-board-label">
                ID de la vacante
              </label>
              <div className="hu8-board-fieldWrap">
                <Search
                  size={16}
                  aria-hidden="true"
                  className="hu8-board-fieldIcon"
                />
                <input
                  id="vacancy-id"
                  className="hu8-board-field"
                  value={vacancyId}
                  onChange={(event) => {
                    setVacancyId(event.target.value);
                    reset();
                  }}
                  placeholder="Ingresa el ID de la vacante"
                  disabled={loading}
                  aria-invalid={Boolean(validationError)}
                  aria-describedby={
                    validationError ? "vacancy-id-error" : undefined
                  }
                />
              </div>
            </div>
            <button
              type="submit"
              className="hu8-board-button hu8-consultation-submit"
              disabled={loading}
            >
              {loading ? "Consultando..." : "Consultar"}
            </button>
          </form>
        </>
      )}
      {validationError && (
        <p
          id="vacancy-id-error"
          role="alert"
          className="hu8-consultation-errorText"
        >
          {validationError}
        </p>
      )}

      <section aria-label="Resultado de la consulta" aria-busy={loading}>
        {loading && (
          <div>
            <p role="status">Consultando requisitos técnicos...</p>
            <div className="hu8-requirements-skeleton" aria-hidden="true">
              {[1, 2, 3].map((line) => (
                <div key={line} className="hu8-board-skeleton" />
              ))}
            </div>
          </div>
        )}
        {state.status === "error" && (
          <div role="alert" className="hu8-consultation-error">
            <CircleAlert size={28} aria-hidden="true" />
            <h3>No se pudieron consultar los requisitos técnicos</h3>
            <p>
              {state.httpStatus !== undefined &&
                `Error HTTP ${state.httpStatus}. `}
              {state.message}
            </p>
            <button
              type="button"
              className="hu8-board-button hu8-board-errorRetry"
              onClick={() => void consult(state.vacancyId)}
            >
              <RefreshCw size={16} aria-hidden="true" />
              Reintentar
            </button>
          </div>
        )}
        {state.status === "success" && (
          <>
            <p className="hu8-consultation-id">
              ID consultado: {state.vacancyId}
            </p>
            {state.requirements.length === 0 ? (
              <p role="status" className="hu8-consultation-empty">
                La consulta no devolvió requisitos técnicos para este ID.
              </p>
            ) : (
              <ul className="hu8-detail-bullets hu8-detail-requirements">
                {state.requirements.map((requirement) => (
                  <li key={requirement.id}>
                    <strong>{requirement.competencia}</strong>
                    <div className="hu8-requirement-meta">
                      <span>Nivel: {requirement.nivel}</span>
                      <span
                        className={
                          requirement.tipo === "Deseable"
                            ? "hu8-requirement-desirable"
                            : ""
                        }
                      >
                        Tipo: {requirement.tipo}
                      </span>
                    </div>
                    {requirement.descripcion && (
                      <p>{requirement.descripcion}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {linkToDetail && (
              <div className="hu8-consultation-detailLink">
                <Link
                  href={`/job-postings/${encodeURIComponent(state.vacancyId)}`}
                  className="hu8-board-button hu8-board-offer"
                >
                  Ver oferta
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <p className="hu8-detail-muted">
                  Abre el detalle real de la oferta, su empresa y su afinidad
                  cuando esté disponible.
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </section>
  );
}
