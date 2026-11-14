import { redirect } from "next/navigation";

export const instant = false;

export default async function LegacyEditExperiencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/perfil/experiencia-laboral/${encodeURIComponent(id)}/editar`);
}
