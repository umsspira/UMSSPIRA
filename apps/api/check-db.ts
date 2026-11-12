import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './src/generated/prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

(async () => {
  console.log('--- CONECTANDO A:', process.env.DATABASE_URL?.split('@')[1]);
  const postulaciones = await prisma.postulacion.findMany({
    include: { vacante: { include: { empresa: true } } }
  });
  
  console.log(`Total postulaciones en la BD: ${postulaciones.length}`);
  postulaciones.forEach(p => {
    console.log(`- ID: ${p.id} | Estado: ${p.estado} | Vacante: ${p.vacante?.titulo} | Empresa Dueña ID: ${p.vacante?.empresa?.id_usuario}`);
  });

  await prisma.$disconnect();
})();
