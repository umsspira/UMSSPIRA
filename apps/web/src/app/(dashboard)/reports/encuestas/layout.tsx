import type { ReactNode } from 'react';
import { SurveyAdminTabs } from '@/modules/surveys/frontend/components/survey-admin-tabs';

export default function SurveysAdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="px-6 pt-4">
        <SurveyAdminTabs />
      </div>
      {children}
    </div>
  );
}