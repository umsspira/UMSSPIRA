import { redirect } from "next/navigation";

export const instant = false;

export default async function LegacyExperienceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/perfil/experiencia-laboral/${encodeURIComponent(id)}`);
}
