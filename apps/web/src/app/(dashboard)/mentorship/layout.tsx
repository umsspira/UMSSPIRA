import type { ReactNode } from 'react';
import { PortalSiteFooter } from '@/shared/components/portal-site-footer';
import './mentorship.css';
import '@/features/mentorship/mentor-profile.css';
import '@/features/mentorship/received-requests.css';
import '@/features/mentorship/mentor-request.css';
import '@/features/mentorship/mentor-setup-steps.css';
import '@/features/mentorship/mentor-onboarding.css';

export default function MentoriasLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1">{children}</div>
      <PortalSiteFooter />
    </div>
  );
}
