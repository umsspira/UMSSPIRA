"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  Laptop,
  LoaderCircle,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import { ApiError } from "@/shared/services/api-client";
import {
  getJobPosting,
  type JobPostingDetail,
} from "@/shared/services/job-postings";
import styles from "./vacancy-detail.module.css";

type DetailState =
  | { id: string; kind: "loading" }
  | { id: string; kind: "loaded"; posting: JobPostingDetail }
  | { id: string; kind: "unavailable" }
  | { id: string; kind: "error" };

function formatModality(modality: string): string {
  switch (modality.trim().toLocaleUpperCase()) {
    case "REMOTO":
      return "Remoto";
    case "PRESENCIAL":
      return "Presencial";
    case "HIBRIDO":
    case "HÍBRIDO":
      return "Híbrido";
    default:
      return modality;
  }
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat("es-BO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function VacancyFooter() {
  return (
    <footer className={styles.pageFooter}>
      <span>Universidad Mayor de San Simón · UMSS Inspira · Vinculación Laboral</span>
      <span className={styles.footerLinks}>
        <span>Ayuda y Soporte</span>
        <span>Política de Privacidad</span>
        <span>Términos de uso</span>
      </span>
    </footer>
  );
}

function VacancyState({
  kind,
  onRetry,
}: {
  kind: "unavailable" | "error";
  onRetry?: () => void;
}) {
  const unavailable = kind === "unavailable";

  return (
    <div className={styles.page}>
      <main className={styles.stateMain}>
        <section
          className={`${styles.stateCard} ${unavailable ? "" : styles.errorStateCard}`}
          aria-labelledby="vacancy-state-title"
        >
          <div className={`${styles.stateIcon} ${unavailable ? "" : styles.errorIcon}`}>
            {unavailable ? (
              <BriefcaseBusiness aria-hidden="true" size={24} />
            ) : (
              <TriangleAlert aria-hidden="true" size={24} />
            )}
          </div>
          <h1 id="vacancy-state-title" className={styles.stateTitle}>
            {unavailable
              ? "Esta vacante ya no está disponible"
              : "No pudimos cargar el detalle de la vacante"}
          </h1>
          <p className={styles.stateDescription}>
            {unavailable
              ? "La oferta que intentas consultar fue cerrada, retirada o ya no se encuentra disponible. Puedes regresar a la Bolsa de trabajo para consultar otras oportunidades."
              : "Ocurrió un problema al consultar la información de esta oferta. Intenta nuevamente en unos momentos."}
          </p>
          <div className={styles.stateActions}>
            {!unavailable && (
              <button
                type="button"
                onClick={onRetry}
                className={styles.primaryButton}
              >
                <RotateCcw aria-hidden="true" size={16} />
                Reintentar
              </button>
            )}
            <Link href="/job-postings" className={styles.secondaryButton}>
              <ArrowLeft aria-hidden="true" size={16} />
              Volver a vacantes
            </Link>
          </div>
        </section>
      </main>
      <VacancyFooter />
    </div>
  );
}

function AffinityCard({ posting }: { posting: JobPostingDetail }) {
  const percentage = posting.affinityPercentage;
  return (
    <section
      className={`${styles.card} ${styles.affinityCard}`}
      aria-label="Tu afinidad con esta vacante"
    >
      <p className={styles.affinityEyebrow}>Tu afinidad con esta vacante</p>
      {percentage !== null ? (
        <>
          <p className={styles.affinityValue}>
            {new Intl.NumberFormat("es-BO", { maximumFractionDigits: 0 }).format(percentage)} %
          </p>
          <p className={styles.affinityCaption}>Afinidad con tu perfil</p>
        </>
      ) : (
        <>
          <div className={styles.notCalculatedIcon}>
            <Clock3 aria-hidden="true" size={18} />
          </div>
          <p className={styles.notCalculatedTitle}>Afinidad no calculada</p>
          <p className={styles.affinityCaption}>
            {posting.affinityMessage ??
              "El porcentaje de afinidad aún no está disponible para esta vacante."}
          </p>
        </>
      )}
    </section>
  );
}

function VacancyDetails({
  posting,
  isGraduate,
}: {
  posting: JobPostingDetail;
  isGraduate: boolean;
}) {
  const company = posting.company;
  const publishedDate = formatDate(posting.publishedAt);
  const requirements = posting.technicalRequirements.filter(
    (requirement) => requirement.name.trim().length > 0,
  );

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Link href="/job-postings" className={styles.backLink}>
          <ArrowLeft aria-hidden="true" size={16} />
          Volver a vacantes
        </Link>

        <header className={styles.hero}>
          {company?.bannerUrl && (
            <Image
              src={company.bannerUrl}
              alt=""
              fill
              priority
              unoptimized
              sizes="(max-width: 1280px) 100vw, 1280px"
              className={styles.heroImage}
            />
          )}
          <div className={styles.heroShade} />
          <span className={styles.openBadge}>Disponible</span>
          <p className={styles.heroTopline}>
            <span className={styles.companyName}>
              {company?.name ?? "Empresa no especificada"}
            </span>
            <span aria-hidden="true">·</span>
            <span>Convocatoria activa</span>
          </p>
          <h1 className={styles.title}>{posting.title ?? "Vacante sin título"}</h1>
          <div className={styles.badges}>
            {posting.modality && (
              <span className={styles.badge}>
                <Laptop aria-hidden="true" size={13} />
                {formatModality(posting.modality)}
              </span>
            )}
            {posting.experienceLevel && (
              <span className={styles.badge}>
                <BriefcaseBusiness aria-hidden="true" size={13} />
                {posting.experienceLevel}
              </span>
            )}
            {publishedDate && (
              <span className={styles.badge}>
                <CalendarDays aria-hidden="true" size={13} />
                Publicada el {publishedDate}
              </span>
            )}
          </div>
        </header>

        <div className={styles.columns}>
          <div className={styles.primaryColumn}>
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Acerca del puesto</h2>
              <p className={styles.bodyText}>
                {posting.technicalDescription?.trim() ||
                  "La empresa no registró una descripción para esta vacante."}
              </p>
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Competencias requeridas</h2>
              {requirements.length > 0 ? (
                <ul className={styles.requirementList}>
                  {requirements.map((requirement, index) => (
                    <li
                      key={requirement.id ?? `${requirement.name}-${index}`}
                      className={styles.requirement}
                    >
                      <span className={styles.requirementDot} aria-hidden="true" />
                      <span className={styles.requirementContent}>
                        <strong>{requirement.name}</strong>
                        <span className={styles.requirementMeta}>
                          {requirement.level && <span>Nivel: {requirement.level}</span>}
                          {requirement.type && <span>Tipo: {requirement.type}</span>}
                        </span>
                        {requirement.description && (
                          <span className={styles.requirementDescription}>
                            {requirement.description}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.bodyText}>
                  Esta vacante no tiene competencias técnicas registradas.
                </p>
              )}
            </section>

            {company && (
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Empresa empleadora</h2>
                <div className={styles.companyCard}>
                  {company.logoUrl ? (
                    <Image
                      src={company.logoUrl}
                      alt=""
                      width={42}
                      height={42}
                      unoptimized
                      className={styles.companyLogo}
                    />
                  ) : (
                    <span className={styles.companyLogoFallback} aria-hidden="true">
                      {(company.name ?? "E").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <h3 className={styles.companyTitle}>
                      {company.name ?? "Empresa no especificada"}
                    </h3>
                    {company.description && (
                      <p className={`${styles.bodyText} mt-1`}>
                        {company.description}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>

          <aside className={styles.asideColumn}>
            {isGraduate && <AffinityCard posting={posting} />}
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Información de la oferta</h2>
              <dl className={styles.offerInfo}>
                {company?.name && (
                  <div className={styles.offerInfoRow}>
                    <dt className={styles.offerInfoLabel}>Empresa</dt>
                    <dd className={styles.offerInfoValue}>{company.name}</dd>
                  </div>
                )}
                {posting.modality && (
                  <div className={styles.offerInfoRow}>
                    <dt className={styles.offerInfoLabel}>Modalidad</dt>
                    <dd className={styles.offerInfoValue}>
                      {formatModality(posting.modality)}
                    </dd>
                  </div>
                )}
                {posting.experienceLevel && (
                  <div className={styles.offerInfoRow}>
                    <dt className={styles.offerInfoLabel}>Experiencia</dt>
                    <dd className={styles.offerInfoValue}>{posting.experienceLevel}</dd>
                  </div>
                )}
                {publishedDate && (
                  <div className={styles.offerInfoRow}>
                    <dt className={styles.offerInfoLabel}>Publicación</dt>
                    <dd className={styles.offerInfoValue}>{publishedDate}</dd>
                  </div>
                )}
              </dl>
            </section>
          </aside>
        </div>
      </main>
      <VacancyFooter />
    </div>
  );
}

export function VacancyDetailClient({
  id,
  isGraduate,
}: {
  id: string;
  isGraduate: boolean;
}) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<DetailState>({ id, kind: "loading" });
  const visibleState: DetailState =
    state.id === id ? state : { id, kind: "loading" };

  useEffect(() => {
    const controller = new AbortController();
    setState({ id, kind: "loading" });

    getJobPosting(id, controller.signal)
      .then((posting) => setState({ id, kind: "loaded", posting }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 404) {
          setState({ id, kind: "unavailable" });
          return;
        }
        console.error("No se pudo cargar el detalle de la vacante", error);
        setState({ id, kind: "error" });
      });

    return () => controller.abort();
  }, [id, attempt]);

  if (visibleState.kind === "loaded") {
    return <VacancyDetails posting={visibleState.posting} isGraduate={isGraduate} />;
  }
  if (visibleState.kind === "unavailable") {
    return <VacancyState kind="unavailable" />;
  }
  if (visibleState.kind === "error") {
    return (
      <VacancyState
        kind="error"
        onRetry={() => setAttempt((value) => value + 1)}
      />
    );
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Link href="/job-postings" className={styles.backLink}>
          <ArrowLeft aria-hidden="true" size={16} />
          Volver a vacantes
        </Link>
        <div className={styles.loadingCard} role="status">
          <LoaderCircle aria-hidden="true" className="animate-spin" size={20} />
          Cargando detalle de la vacante...
        </div>
      </main>
      <VacancyFooter />
    </div>
  );
}
