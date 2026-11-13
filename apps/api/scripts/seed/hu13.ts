import { config } from 'dotenv';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createDatabaseClient } from '../database-client';
config({ path: resolve(__dirname, '../../.env'), quiet: true });
const target = new URL(process.env.DIRECT_URL ?? process.env.DATABASE_URL!);
if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.pathname !== '/hu13_local') {
  throw new Error('Solo se admite hu13_local.');
}
const db = createDatabaseClient();
const id = (n: number) => `13000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
async function main() {
  const file = await readFile(resolve(__dirname, '../../../web/tests/fixtures/ocr/respaldo.png'));
  await db.$transaction(async (tx) => {
    await tx.borradorRegistro.upsert({
      where: { id: id(1) },
      update: {},
      create: {
        id: id(1),
        token_hash: '13'.repeat(32),
        datos: {},
        expira_en: new Date('2030-01-01'),
        correo_verificado: true,
      },
    });
    await tx.archivoRegistro.upsert({
      where: { id: id(2) },
      update: {},
      create: {
        id: id(2),
        id_borrador: id(1),
        tipo_documento: 'CERTIFICADO_CONCLUSION',
        nombre: 'respaldo-ficticio-hu13.png',
        mime: 'image/png',
        contenido: file,
        size_bytes: file.length,
      },
    });
    await tx.documentoRespaldo.upsert({
      where: { id: id(3) },
      update: {},
      create: {
        id: id(3),
        ruta_storage: id(2),
        tamanio_mb: 1,
        fecha_creacion: new Date(),
        es_valido: false,
      },
    });
    await tx.detalleSolicitud.upsert({
      where: { id: id(4) },
      update: {},
      create: {
        id: id(4),
        nombre: 'José Andrés',
        apellido: 'Pérez Mamani',
        ci: '5918234',
        cod_sis: 201704981,
        anio_egreso: 2023,
        email: 'hu13.ficticio@example.com',
        id_carrera: '10000000-0000-4000-8000-000000000001',
      },
    });
    await tx.solicitud.upsert({
      where: { id: id(5) },
      update: {},
      create: {
        id: id(5),
        codigo_tit: 'TIT-HU13-PRUEBA',
        id_detalle_solicitud: id(4),
        id_documento_respaldo: id(3),
        estado: 'PENDIENTE',
        fecha_creacion: new Date(),
      },
    });
    await tx.borradorRegistro.update({ where: { id: id(1) }, data: { id_solicitud: id(5) } });
  });
  console.log('Muestra local lista: TIT-HU13-PRUEBA (datos ficticios).');
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
