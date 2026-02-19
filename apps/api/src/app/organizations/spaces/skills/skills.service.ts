import { Injectable, Inject } from '@nestjs/common';
import { SkillsHexa } from '@packmind/skills';
import {
  ClientSource,
  DeleteSkillResponse,
  DeleteSkillsBatchResponse,
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
    source: ClientSource,
    originSkill?: string,
  ): Promise<UploadSkillResponse> {
    return this.skillsHexa.getAdapter().uploadSkill({
      files,
      organizationId,
      userId,
      spaceId,
      source,
      originSkill,
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

  async deleteSkill(
    skillId: SkillId,
    spaceId: SpaceId,
    organizationId: OrganizationId,
    userId: UserId,
    source: ClientSource,
  ): Promise<DeleteSkillResponse> {
    return this.skillsHexa.getAdapter().deleteSkill({
      skillId,
      organizationId,
      userId,
      source,
    });
  }

  async getSkillWithFilesById(
    skillId: SkillId,
    spaceId: SpaceId,
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<SkillWithFiles | null> {
    const adapter = this.skillsHexa.getAdapter();

    const { skill } = await adapter.getSkillById({
      skillId,
      spaceId,
      organizationId,
      userId,
    });

    if (!skill) {
      return null;
    }

    const { skillVersion: latestVersion } =
      await adapter.getLatestSkillVersionUseCase({
        skillId,
        spaceId,
        organizationId,
        userId,
      });

    if (!latestVersion) {
      return null;
    }

    const files = await adapter.getSkillFiles(latestVersion.id);

    return {
      skill,
      files,
      latestVersion,
    };
  }

  async deleteSkillsBatch(
    skillIds: SkillId[],
    organizationId: OrganizationId,
    userId: UserId,
    source: ClientSource,
  ): Promise<DeleteSkillsBatchResponse> {
    return this.skillsHexa.getAdapter().deleteSkillsBatch({
      skillIds,
      organizationId,
      userId,
      source,
    });
  }
}
