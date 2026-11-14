import type { Metadata } from "next";
import { ExperienceList } from "../../../modules/profile/frontend/components/experience-list";

export const metadata: Metadata = {
  title: "Mi experiencia laboral | UMSSPIRA",
};

export default function WorkExperiencePage() {
  return <ExperienceList />;
}
