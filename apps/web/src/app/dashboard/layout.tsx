import type { ReactNode } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="dashboard-container">{children}</div>;
}
