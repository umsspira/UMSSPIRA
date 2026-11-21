import Image from 'next/image';

export function AuthBrandHeader() {
  return (
    <header className="flex items-center justify-between gap-3">
      <Image
        src="/images/logo-umsspira-login.png"
        alt="UMSSPIRA"
        width={2160}
        height={724}
        className="h-auto w-[45%] max-w-[220px] object-contain"
        priority
      />
      <Image
        src="/images/logo-umss.png"
        alt="Escudo oficial de la Universidad Mayor de San Simón"
        width={36}
        height={54}
        className="h-12 w-auto shrink-0 object-contain"
        priority
      />
    </header>
  );
}
