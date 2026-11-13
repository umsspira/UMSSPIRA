import AffinityRadar from '@/shared/components/affinity-radar';
import affinityExample from '@/shared/mocks/affinity-vector-mock.json';
import { AFFINITY_AREAS } from '@umsspira/shared-types';

export default function RadarPreviewPage() {
  const areas = AFFINITY_AREAS.map((area) => ({
    area,
    affinity: affinityExample.areas.find((example) => example.area === area)?.affinity ?? 0,
    previousAffinity: null,
  }));

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <h1 className="text-2xl font-bold">Demostración del radar de afinidad</h1>
      <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
        Los datos de esta pantalla son de ejemplo y no corresponden a tu perfil.
      </p>
      <AffinityRadar affinityData={areas} />
    </main>
  );
}
