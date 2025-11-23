import { Module } from '@nestjs/common';
import { DeploymentsController } from './deployments.controller';
import { DeploymentsService } from './deployments.service';
import { LogLevel, PackmindLogger } from '@packmind/logger';

@Module({
  controllers: [DeploymentsController],
  providers: [
    DeploymentsService,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger('OrganizationDeploymentsModule', LogLevel.INFO),
    },
  ],
})
export class OrganizationDeploymentsModule {}
