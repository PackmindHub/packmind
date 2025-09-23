import { Module } from '@nestjs/common';
import { TargetsController } from './targets.controller';
import { TargetsService } from './targets.service';
import { AuthModule } from '../auth/auth.module';
import { LogLevel, PackmindLogger } from '@packmind/shared';

@Module({
  imports: [AuthModule],
  controllers: [TargetsController],
  providers: [
    TargetsService,
    {
      provide: PackmindLogger,
      useFactory: () => new PackmindLogger('TargetsModule', LogLevel.INFO),
    },
  ],
  exports: [TargetsService],
})
export class TargetsModule {}
