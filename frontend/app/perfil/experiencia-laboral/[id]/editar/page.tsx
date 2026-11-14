import type { Metadata } from "next";
import { ExperienceForm } from "../../../../../modules/profile/frontend/components/experience-form";

export const metadata: Metadata = {
  title: "Editar experiencia laboral | UMSSPIRA",
};

export const instant = false;

export default async function EditWorkExperiencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ExperienceForm experienceId={id} />;
}
