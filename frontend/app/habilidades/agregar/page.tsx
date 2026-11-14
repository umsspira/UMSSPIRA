import SkillForm from '../../skills/SkillForm';

export const instant = false;

export default async function AgregarHabilidadPage({
  searchParams,
}: {
  searchParams?: Promise<{ nombre?: string | string[] }>;
}) {
  const params = await searchParams;
  const name = Array.isArray(params?.nombre)
    ? params.nombre[0]
    : params?.nombre;

  return <SkillForm mode="create" initialName={name} />;
}
