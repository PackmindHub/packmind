import { Module } from '@nestjs/common';
import { ImportLegacyController } from './import-legacy.controller';
import { ImportLegacyService } from './import-legacy.service';

@Module({
  imports: [],
  controllers: [ImportLegacyController],
  providers: [ImportLegacyService],
})
export class ImportLegacyModule {}
