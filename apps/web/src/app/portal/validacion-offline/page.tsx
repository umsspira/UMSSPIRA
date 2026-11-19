import type { Metadata } from 'next';
import ValidacionOffline from './validacion-offline';

export const metadata: Metadata = {
  title: 'Validación sin conexión · UMSSPIRA',
};

/** HU08 · Demo de calificación: flujo en Modo Avión y auditoría (ruta /portal/validacion-offline). */
export default function ValidacionOfflinePage() {
  return <ValidacionOffline />;
}
