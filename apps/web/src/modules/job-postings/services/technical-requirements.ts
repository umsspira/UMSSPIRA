/**
 * Compatibility import for the original HU8 UI. Both real views use the same
 * authenticated /api/v1 transport and canonical response validation.
 */
export {
  getTechnicalVacancyRequirements,
  TechnicalRequirementsError,
} from "@/shared/services/technical-requirements";
