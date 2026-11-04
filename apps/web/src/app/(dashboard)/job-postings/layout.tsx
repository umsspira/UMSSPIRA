import type { ReactNode } from 'react';
import JobsHeader from '@/modules/job-postings/components/jobs-header';
import '@/modules/job-postings/styles/jobs-board.css';
import '@/modules/job-postings/styles/vacancy-detail.css';
import '@/modules/job-postings/styles/jobs-header.css';
import '@/modules/job-postings/styles/affinity.css';
import '@/modules/job-postings/styles/hu8.css';

export default function JobPostingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="hu8-shell">
      <a href="#hu8-main" className="hu8-skip-link">Ir al contenido</a>
      <JobsHeader />
      {children}
      <footer className="hu8-detail-footer">
        <div>
          <span>Universidad Mayor de San Simón | UMSS Vinculación Laboral</span>
          <span>UMSSPIRA · Bolsa de trabajo</span>
        </div>
      </footer>
    </div>
  );
}
