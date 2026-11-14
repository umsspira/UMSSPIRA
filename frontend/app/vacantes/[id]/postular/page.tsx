import { Suspense } from 'react';
import PostularVacanteCliente from './PostularVacanteCliente';

export const instant = false;

export default async function PostularVacantePage({
params,
}: {
params: Promise<{ id: string }>;
}) {
const { id } = await params;

return (
<Suspense
fallback={
<main className="min-h-screen bg-[#f1eee4] px-5 py-10">
<p className="text-center text-gray-600">
Cargando formulario de postulación...
</p>
</main>
}
>
<PostularVacanteCliente id={id} />
</Suspense>
);
}