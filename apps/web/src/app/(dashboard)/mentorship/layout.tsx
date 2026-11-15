import type { ReactNode } from 'react';
import './mentorship.css';
import '@/features/mentorship/mentor-profile.css';
import '@/features/mentorship/received-requests.css';
import '@/features/mentorship/mentor-request.css';
import '@/features/mentorship/mentor-setup-steps.css';
import '@/features/mentorship/mentor-onboarding.css';
import { MentorshipNavigation } from '@/features/mentorship/components/mentorship-navigation';

export default function MentoriasLayout({ children }: { children: ReactNode }) {
  return <><MentorshipNavigation>{children}</MentorshipNavigation></>;
}
