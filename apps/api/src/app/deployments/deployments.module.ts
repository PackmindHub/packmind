import { Module } from '@nestjs/common';
import { DeploymentsController } from './deployments.controller';
import { DeploymentsService } from './deployments.service';
import { LogLevel, PackmindLogger } from '@packmind/shared';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DeploymentsController],
  providers: [
    DeploymentsService,
    {
      provide: PackmindLogger,
      useFactory: () => new PackmindLogger('DeploymentsModule', LogLevel.INFO),
    },
  ],
  exports: [DeploymentsService],
})
export class DeploymentsModule {}
