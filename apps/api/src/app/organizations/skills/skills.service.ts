import { Injectable, Inject } from '@nestjs/common';
import { SkillsHexa } from '@packmind/skills';
import {
  OrganizationId,
  Skill,
  UploadSkillFileInput,
  UserId,
} from '@packmind/types';

@Injectable()
export class OrganizationSkillsService {
  constructor(
    @Inject(SkillsHexa)
    private readonly skillsHexa: SkillsHexa,
  ) {}

  async uploadSkill(
    files: UploadSkillFileInput[],
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<Skill> {
    return this.skillsHexa.getAdapter().uploadSkill({
      files,
      organizationId,
      userId,
    });
  }
}
