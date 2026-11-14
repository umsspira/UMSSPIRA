import { Module } from '@nestjs/common';
import { ACCREDITATION_CACHE } from '../../application/ports/accreditation-cache.port';
import { AccreditationCache } from './accreditation-cache';

@Module({
  providers: [
    AccreditationCache,
    { provide: ACCREDITATION_CACHE, useExisting: AccreditationCache },
  ],
  exports: [AccreditationCache, ACCREDITATION_CACHE],
})
export class AccreditationCacheModule {}
