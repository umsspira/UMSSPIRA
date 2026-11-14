import { Module } from '@nestjs/common';
import { AfinidadModule } from './modules/afinidad/afinidad.module';

@Module({
  imports: [
    // Aquí irán CompaniesModule y JobPostingsModule
    AfinidadModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}