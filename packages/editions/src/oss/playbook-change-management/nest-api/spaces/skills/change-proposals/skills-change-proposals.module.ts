import { Module } from '@nestjs/common';
import { OrganizationsSpacesSkillsChangeProposalsController } from './skills-change-proposals.controller';
import { SkillsChangeProposalsService } from './skills-change-proposals.service';
import { PackmindLogger, LogLevel } from '@packmind/logger';

@Module({
  controllers: [OrganizationsSpacesSkillsChangeProposalsController],
  providers: [
    SkillsChangeProposalsService,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger(
          'OrganizationsSpacesSkillsChangeProposalsModule',
          LogLevel.INFO,
        ),
    },
  ],
})
export class OrganizationsSpacesSkillsChangeProposalsModule {}
