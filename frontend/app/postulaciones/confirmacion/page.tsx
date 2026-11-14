'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function ConfirmacionContenido() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const codigo = searchParams.get('codigo');

  return (
    <main className="min-h-screen bg-[#f1eee4] px-5 py-12">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="mb-4 text-5xl">✅</div>

        <h1 className="mb-3 text-2xl font-bold text-gray-800">
          ¡Postulación enviada!
        </h1>

        <p className="mb-6 text-gray-600">
          Tu postulación se registró correctamente.
        </p>

        {codigo && (
          <div className="mb-6 rounded-xl bg-green-50 p-4">
            <p className="mb-1 text-sm text-gray-600">
              Tu código de postulación es:
            </p>
            <p className="text-xl font-bold text-green-700">
              {codigo}
            </p>
          </div>
        )}

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button
            onClick={() => router.push('/postulaciones')}
            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Mis postulaciones
          </button>

          <button
            onClick={() => router.push('/vacantes')}
            className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
          >
            Ver vacantes
          </button>
        </div>
      </div>
    </main>
  );
}

export default function ConfirmacionPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f1eee4] px-5 py-10">
          <p className="text-center text-gray-600">
            Cargando confirmación...
          </p>
        </main>
      }
    >
      <ConfirmacionContenido />
    </Suspense>
  );
}