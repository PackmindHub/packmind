import { Module } from '@nestjs/common';
import { OrganizationsSpacesCommandsChangeProposalsController } from './commands-change-proposals.controller';
import { CommandsChangeProposalsService } from './commands-change-proposals.service';
import { PackmindLogger, LogLevel } from '@packmind/logger';

@Module({
  controllers: [OrganizationsSpacesCommandsChangeProposalsController],
  providers: [
    CommandsChangeProposalsService,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger(
          'OrganizationsSpacesRecipesChangeProposalsModule',
          LogLevel.INFO,
        ),
    },
  ],
})
export class OrganizationsSpacesCommandsChangeProposalsModule {}
