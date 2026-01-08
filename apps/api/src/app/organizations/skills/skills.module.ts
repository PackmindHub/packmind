import { Module } from '@nestjs/common';
import { OrganizationSkillsController } from './skills.controller';
import { OrganizationSkillsService } from './skills.service';
import { HexaRegistryModule } from '../../shared/HexaRegistryModule';

@Module({
  imports: [HexaRegistryModule],
  controllers: [OrganizationSkillsController],
  providers: [OrganizationSkillsService],
})
export class OrganizationSkillsModule {}
