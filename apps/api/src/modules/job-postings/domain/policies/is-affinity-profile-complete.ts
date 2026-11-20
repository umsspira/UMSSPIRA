export interface AffinityProfileCompleteness {
  description: string | null;
  hasEducation: boolean;
  hasExperience: boolean;
  hasCertification: boolean;
  hasProject: boolean;
}

/** Conserva la regla de postulación vigente; su flexibilización requiere acuerdo del PO. */
export function isAffinityProfileComplete(profile: AffinityProfileCompleteness): boolean {
  return Boolean(
    profile.description?.trim() &&
    profile.hasEducation &&
    profile.hasExperience &&
    profile.hasCertification &&
    profile.hasProject,
  );
}
