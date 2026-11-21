import { createDatabaseClient } from '../database-client';
import { seedRadarCatalog } from './radar-catalog';

async function main(): Promise<void> {
  const prisma = createDatabaseClient();

  try {
    console.info('Iniciando publicación del diccionario Radar...');
    await seedRadarCatalog(prisma);
    console.info('Publicación del diccionario Radar completada.');
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error('Error al publicar el diccionario Radar:', error);
  process.exitCode = 1;
});
