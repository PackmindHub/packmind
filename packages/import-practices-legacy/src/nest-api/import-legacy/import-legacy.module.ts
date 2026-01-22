import { Module } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import { ImportLegacyController } from './import-legacy.controller';
import { ImportLegacyService } from './import-legacy.service';

@Module({
  imports: [],
  controllers: [ImportLegacyController],
  providers: [
    ImportLegacyService,
    {
      provide: PackmindLogger,
      useFactory: () => new PackmindLogger('ImportLegacyModule'),
    },
  ],
})
export class ImportLegacyModule {}
