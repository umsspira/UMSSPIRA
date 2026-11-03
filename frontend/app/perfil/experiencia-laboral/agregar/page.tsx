import type { Metadata } from "next";
import { ExperienceForm } from "../../../../modules/profile/frontend/components/experience-form";

export const metadata: Metadata = {
  title: "Agregar experiencia laboral | UMSSPIRA",
};

export default function NewWorkExperiencePage() {
  return <ExperienceForm />;
}
