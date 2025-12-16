import { Module } from '@nestjs/common';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { OrganizationMcpModule } from '../organizations/mcp/mcp.module';
import { TrialController } from './trial.controller';

@Module({
  imports: [OrganizationMcpModule],
  controllers: [TrialController],
  providers: [
    {
      provide: PackmindLogger,
      useFactory: () => new PackmindLogger('TrialModule', LogLevel.INFO),
    },
  ],
})
export class TrialModule {}
