import type { Metadata } from "next";
import { ExperienceDetail } from "../../../../modules/profile/frontend/components/experience-detail";

export const metadata: Metadata = {
  title: "Detalle de experiencia laboral | UMSSPIRA",
};

export const instant = false;

export default async function WorkExperienceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ExperienceDetail key={id} experienceId={id} />;
}
