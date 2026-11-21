import { RegistrationHeader } from '@/modules/registration/frontend/components/registration-header';

export default function RegistrationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-palladian">
      <RegistrationHeader />
      {children}
    </div>
  );
}
