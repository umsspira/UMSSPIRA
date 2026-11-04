import { createDatabaseClient } from '../database-client';
import { assertDemoEnvironment } from './demo-environment';
import { seedInformaticsAdmin } from './informatics-career';

async function seed(): Promise<void> {
  const prisma = createDatabaseClient();
  try {
    assertDemoEnvironment(process.env);
    const careerId = await seedInformaticsAdmin(prisma);
    console.info(
      `Informática preparada; los registros existentes conservaron sus datos. Carrera: ${careerId}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void seed().catch((error: unknown) => {
  console.error(
    error instanceof Error &&
      /^(Hay varias carreras|El UUID previsto|Debe existir|El seed de demostración)/.test(
        error.message,
      )
      ? error.message
      : 'No se pudo asignar Informática; revisar la conexión y los registros existentes.',
  );
  process.exitCode = 1;
});
