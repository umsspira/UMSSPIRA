import { useState, useMemo } from "react";
import { Applicant } from "../types/applicant";
import { hasMatch } from "../utils/match-format";

export function useApplicantFilters(initialApplicants: Applicant[]) {
  const [searchTerm, setSearchTerm] = useState("");
  const [minMatch, setMinMatch] = useState<number>(0);
  const [selectedStatus, setSelectedStatus] = useState<string>("Todos");

  const filteredApplicants = useMemo(() => {
    return initialApplicants.filter((applicant) => {
      // % mínimo: un postulante sin porcentaje disponible solo se oculta
      // cuando se exige un mínimo mayor a 0 (no se inventa un valor).
      if (minMatch > 0) {
        if (!hasMatch(applicant.matchPercentage)) return false;
        if (applicant.matchPercentage < minMatch) return false;
      }

      // Buscador por texto (nombre o correo)
      if (searchTerm.trim() !== "") {
        const query = searchTerm.toLowerCase();
        const matchesName = applicant.name.toLowerCase().includes(query);
        const matchesEmail = applicant.email.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail) return false;
      }

      // Estado del postulante
      if (selectedStatus !== "Todos" && applicant.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [initialApplicants, searchTerm, minMatch, selectedStatus]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setMinMatch(0);
    setSelectedStatus("Todos");
  };

  return {
    searchTerm,
    setSearchTerm,
    minMatch,
    setMinMatch,
    selectedStatus,
    setSelectedStatus,
    filteredApplicants,
    handleClearFilters,
  };
}