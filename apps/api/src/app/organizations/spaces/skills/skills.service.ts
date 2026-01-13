import { Injectable, Inject } from '@nestjs/common';
import { SkillsHexa } from '@packmind/skills';
import {
  OrganizationId,
  Skill,
  SkillId,
  SkillVersion,
  SkillWithFiles,
  SpaceId,
  UploadSkillFileInput,
  UploadSkillResponse,
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
  ): Promise<UploadSkillResponse> {
    return this.skillsHexa.getAdapter().uploadSkill({
      files,
      organizationId,
      userId,
      spaceId,
    });
  }

  async getSkillWithFiles(
    slug: string,
    spaceId: SpaceId,
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<SkillWithFiles | null> {
    const result = await this.skillsHexa.getAdapter().getSkillWithFilesUseCase({
      slug,
      spaceId,
      organizationId,
      userId,
    });

    return result.skillWithFiles;
  }

  async listSkillVersions(
    skillId: SkillId,
    spaceId: SpaceId,
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<SkillVersion[]> {
    const result = await this.skillsHexa.getAdapter().listSkillVersionsUseCase({
      skillId,
      spaceId,
      organizationId,
      userId,
    });
    return result.versions;
  }
}
