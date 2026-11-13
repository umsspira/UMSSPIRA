import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './src/generated/prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

(async () => {
  // 1. Buscar la empresa
  const empresa = await prisma.empresa.findFirst({
    where: { id_usuario: '20000000-0000-4000-8000-000000000003' }
  });
  if (!empresa) {throw new Error("No se encontró la empresa en la BD");}

  // 2. Crear la vacante
  const vacante = await prisma.vacante.create({
    data: {
      id_empresa: empresa.id,
      titulo: 'Vacante Prueba HU-04',
      estado: 'PUBLICADO',
    }
  });

  // 3. Crear la postulación (asignando al titulado)
  const postulacion = await prisma.postulacion.create({
    data: {
      id_vacante: vacante.id,
      id_usuario: '20000000-0000-4000-8000-000000000001', // titulado@umss.edu.bo
      estado: 'Postulado'
    }
  });

  console.log('¡Postulación creada con exito! ID:', postulacion.id);
  await prisma.$disconnect();
})();
