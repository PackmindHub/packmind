import { Injectable, Inject } from '@nestjs/common';
import { SkillsHexa } from '@packmind/skills';
import {
  OrganizationId,
  Skill,
  SpaceId,
  UploadSkillFileInput,
  UserId,
} from '@packmind/types';

@Injectable()
export class SkillsService {
  constructor(
    @Inject(SkillsHexa)
    private readonly skillsHexa: SkillsHexa,
  ) {}

  async getSkillsBySpace(
    spaceId: SpaceId,
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<Skill[]> {
    return this.skillsHexa
      .getAdapter()
      .listSkillsBySpace(spaceId, organizationId, userId);
  }

  async uploadSkill(
    files: UploadSkillFileInput[],
    organizationId: OrganizationId,
    spaceId: SpaceId,
    userId: UserId,
  ): Promise<Skill> {
    return this.skillsHexa.getAdapter().uploadSkill({
      files,
      organizationId,
      userId,
      spaceId,
    });
  }
}
