import { Module } from '@nestjs/common';
import { OrganizationsSpacesStandardsChangeProposalsController } from './standards-change-proposals.controller';
import { StandardsChangeProposalsService } from './standards-change-proposals.service';
import { PackmindLogger, LogLevel } from '@packmind/logger';

@Module({
  controllers: [OrganizationsSpacesStandardsChangeProposalsController],
  providers: [
    StandardsChangeProposalsService,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger(
          'OrganizationsSpacesStandardsChangeProposalsModule',
          LogLevel.INFO,
        ),
    },
  ],
})
export class OrganizationsSpacesStandardsChangeProposalsModule {}
