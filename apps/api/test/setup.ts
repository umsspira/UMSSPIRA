// Las pruebas normales usan dobles; la integración opt-in de permisos solo lee la copia.
process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://prueba:prueba@localhost:5432/pruebas';
process.env.DIRECT_URL = 'postgresql://prueba:prueba@localhost:5432/pruebas';
process.env.CORS_ORIGINS = 'http://localhost:3001';
process.env.AUTH_JWT_SECRET = 'clave-exclusiva-de-pruebas-'.repeat(4);
// Claves VAPID de prueba (HU13): el esquema de entorno las exige para arrancar.
process.env.VAPID_PUBLIC_KEY = 'clave-publica-vapid-de-pruebas';
process.env.VAPID_PRIVATE_KEY = 'clave-privada-vapid-de-pruebas';
process.env.VAPID_SUBJECT = 'mailto:push@umsspira.test';

