
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import PortalHeader from './components/PortalHeader';

export const metadata: Metadata = {
  title: 'UMSSPIRA | Portal de Egresados',
  description:
    'Portal de vinculación laboral de la Universidad Mayor de San Simón.',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen">
        <PortalHeader />
        {children}
      </body>
    </html>
  );
}
