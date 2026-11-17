import type { ReactNode } from 'react';
import { PassWorkerRegister } from '@/features/event-passes/pass-worker-register';

export default function MyPassesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PassWorkerRegister />
      {children}
    </>
  );
}
