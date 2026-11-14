import EditarVacanteForm from "./EditarVacanteForm";

export const instant = false;

export default async function EditarVacantePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id) {
    return (
      <main className="p-8">
        <h1 className="text-xl font-bold">
          Vacante no encontrada
        </h1>
      </main>
    );
  }

  return <EditarVacanteForm id={id} />;
}
