import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsSpacesSkillsController } from './skills.controller';
import { SkillsService } from './skills.service';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';
import { SpaceAccessGuard } from '../guards/space-access.guard';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { skillsSchemas } from '@packmind/skills';

@Module({
  imports: [TypeOrmModule.forFeature(skillsSchemas)],
  controllers: [OrganizationsSpacesSkillsController],
  providers: [
    SkillsService,
    OrganizationAccessGuard,
    SpaceAccessGuard,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger('OrganizationsSpacesSkillsModule', LogLevel.INFO),
    },
  ],
  exports: [SkillsService],
})
export class OrganizationsSpacesSkillsModule {}
