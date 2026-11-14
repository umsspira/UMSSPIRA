import Image from "next/image";

export function ProfileSummary() {
  return (
    <section
      aria-labelledby="profile-summary-name"
      className="mb-6 flex items-center gap-4 rounded-2xl border border-[oklch(0.91_0.008_80)] bg-white p-6 shadow-sm"
    >
      <Image
        src="/hu03/placeholder-user.jpg"
        alt=""
        width={64}
        height={64}
        unoptimized
        className="size-16 shrink-0 rounded-full border border-[oklch(0.91_0.008_80)] object-cover"
      />
      <div className="min-w-0">
        <h2 id="profile-summary-name" className="text-lg font-semibold text-[oklch(0.22_0.01_60)]">
          Carlos Rojas
        </h2>
        <p className="text-sm text-[oklch(0.5_0.01_60)]">Egresado</p>
      </div>
    </section>
  );
}
