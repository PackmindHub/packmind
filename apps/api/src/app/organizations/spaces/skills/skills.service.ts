import { Injectable } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import {
  ISkillsPort,
  OrganizationId,
  Skill,
  SpaceId,
  UserId,
} from '@packmind/types';
import { InjectSkillsAdapter } from '../../../shared/HexaInjection';

@Injectable()
export class SpaceSkillsService {
  constructor(
    @InjectSkillsAdapter() private readonly skillsAdapter: ISkillsPort,
    private readonly logger: PackmindLogger,
  ) {}

  async getSkillsBySpace(
    spaceId: SpaceId,
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<Skill[]> {
    return this.skillsAdapter.listSkillsBySpace(
      spaceId,
      organizationId,
      userId,
    );
  }
}
