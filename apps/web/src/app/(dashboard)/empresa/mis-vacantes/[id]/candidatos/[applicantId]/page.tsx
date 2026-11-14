"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Applicant } from "@/shared/types/applicant";
import { Vacancy } from "@/shared/types/vacancy";
import {
  getApplicantById,
  MATCH_ENGINE_ERROR_MESSAGE,
} from "@/shared/services/applicants";
import { getVacancyById } from "@/shared/services/vacancies";
import { VacancyHeader } from "@/shared/components/vacancy-header";
import { MatchBreakdownView } from "@/shared/components/match-breakdown-view";
import { Cargando, EstadoError } from "../../../../_components/estado-pantalla";

export default function ApplicantMatchPage() {
  const params = useParams();
  const router = useRouter();
  const vacancyId = params?.id as string;
  const applicantId = params?.applicantId as string;

  const [applicant, setApplicant] = useState<Applicant | null>(null);
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const goBackToList = () => router.push(`/empresa/mis-vacantes/${vacancyId}/candidatos`);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(false);
      try {
        // Primero la vacante: su fecha de publicación se usa para la fecha de
        // postulación de prueba (BUG-05-01). Si falla, solo se oculta su tarjeta.
        const vac = await getVacancyById(vacancyId).catch(() => null);
        const data = await getApplicantById(vacancyId, applicantId, vac?.publishedAt);
        if (!cancelled) {
          setApplicant(data);
          setVacancy(vac);
        }
      } catch {
        if (!cancelled) {
          setApplicant(null);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [vacancyId, applicantId, reloadKey]);

  return (
    <div className="w-full max-w-[1536px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {vacancy && <VacancyHeader vacancy={vacancy} />}

      {loading && <Cargando texto="Cargando candidato..." />}

      {!loading && error && (
        <div className="space-y-2">
          <EstadoError
            mensaje={MATCH_ENGINE_ERROR_MESSAGE}
            onReintentar={() => setReloadKey((k) => k + 1)}
          />
          <div className="mx-auto max-w-xl px-8">
            <button
              onClick={goBackToList}
              className="min-h-11 md:min-h-0 w-full rounded-lg border border-gray-300 px-4 py-2 text-xs font-bold text-[#1B2632] hover:bg-gray-50"
            >
              Volver a la lista
            </button>
          </div>
        </div>
      )}

      {!loading && !error && !applicant && (
        <div className="p-8 text-center space-y-4">
          <p className="text-gray-500">No se encontró al postulante.</p>
          <button
            onClick={goBackToList}
            className="min-h-11 md:min-h-0 w-full sm:w-auto px-4 py-2 text-xs font-bold text-[#1B2632] border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Volver a la lista
          </button>
        </div>
      )}

      {!loading && !error && applicant && (
        <MatchBreakdownView applicant={applicant} onBack={goBackToList} />
      )}
    </div>
  );
}