import { Module } from '@nestjs/common';
import { LinterController } from './linter.controller';
import { LinterService } from './linter.service';
import { PackmindLogger } from '@packmind/logger';

@Module({
  imports: [],
  controllers: [LinterController],
  providers: [
    LinterService,
    {
      provide: PackmindLogger,
      useFactory: () => new PackmindLogger('LinterModule'),
    },
  ],
})
export class LinterModule {}
