
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './config/supabase.module';
import { FormacionAcademicaModule } from './modules/formacion-academica/formacion-academica.module';
import { ExperienciaLaboralModule } from './modules/experiencia-laboral/experiencia-laboral.module';
import { VacantesModule } from './modules/vacantes/vacantes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    FormacionAcademicaModule,
    ExperienciaLaboralModule,
    VacantesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
