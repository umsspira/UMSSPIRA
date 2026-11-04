import { Module } from '@nestjs/common';
import { ExperienciaLaboralController } from './experiencia-laboral.controller';
import { ExperienciaLaboralService } from './experiencia-laboral.service';
import { ExperienceWriteGuard } from './experience-write.guard';
import { SupabaseAuthGuard } from './supabase-auth.guard';

@Module({
  controllers: [ExperienciaLaboralController],
  providers: [
    ExperienciaLaboralService,
    SupabaseAuthGuard,
    ExperienceWriteGuard,
  ],
})
export class ExperienciaLaboralModule {}
