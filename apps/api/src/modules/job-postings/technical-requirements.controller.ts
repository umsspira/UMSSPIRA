import { Controller, Get, Param, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import type { TechnicalVacancyRequirement } from '@umsspira/shared-types';

type RequirementRow = {
  id: string;
  id_vacante: string;
  competencia: string;
  nivel: string;
  tipo: string;
  descripcion: string | null;
  fecha_creacion: string;
};

@Controller('job-postings')
export class TechnicalRequirementsController {
  @Get(':id/requisitos')
  async getRequirements(@Param('id') id: string): Promise<{
    idVacante: string;
    requisitos: TechnicalVacancyRequirement[];
  }> {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new ServiceUnavailableException('Supabase no está configurado');
    }

    const endpoint = new URL(
      `${url.replace(/\/$/, '')}/rest/v1/requisito_tecnico_vacante`,
    );
    endpoint.searchParams.set('id_vacante', `eq.${id}`);
    endpoint.searchParams.set('select', 'id,id_vacante,competencia,nivel,tipo,descripcion,fecha_creacion');
    endpoint.searchParams.set('order', 'fecha_creacion.asc');

    try {
      const response = await fetch(endpoint, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Supabase respondió ${response.status}`);
      }

      const rows = (await response.json()) as RequirementRow[];

      return {
        idVacante: id,
        requisitos: rows.map((row) => ({
          id: row.id,
          idVacante: row.id_vacante,
          competencia: row.competencia,
          nivel: row.nivel,
          tipo: row.tipo,
          descripcion: row.descripcion,
          fechaCreacion: row.fecha_creacion,
        })),
      };
    } catch {
      throw new InternalServerErrorException('No se pudieron consultar los requisitos técnicos');
    }
  }
}
