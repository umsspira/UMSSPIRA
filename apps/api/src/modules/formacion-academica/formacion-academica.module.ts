import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../config/supabase.module';
import { CarrerasController } from './carreras.controller';
import { FormacionAcademicaController } from './formacion-academica.controller';
import { FormacionAcademicaService } from './formacion-academica.service';

@Module({
  imports: [SupabaseModule],
  controllers: [
    FormacionAcademicaController,
    CarrerasController,
  ],
  providers: [FormacionAcademicaService],
})
export class FormacionAcademicaModule {}