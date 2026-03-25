import { Module } from '@nestjs/common';
import { OrganizationsSpacesRecipesChangeProposalsController } from './recipes-change-proposals.controller';
import { RecipesChangeProposalsService } from './recipes-change-proposals.service';
import { PackmindLogger, LogLevel } from '@packmind/logger';

@Module({
  controllers: [OrganizationsSpacesRecipesChangeProposalsController],
  providers: [
    RecipesChangeProposalsService,
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
export class OrganizationsSpacesRecipesChangeProposalsModule {}
