import { Injectable, Inject } from '@nestjs/common';
import { SkillsHexa } from '@packmind/skills';
import {
  CodingAgent,
  ClientSource,
  DeleteSkillResponse,
  DeleteSkillsBatchResponse,
  DownloadSkillZipForAgentResponse,
  IDeploymentPort,
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
import { InjectDeploymentAdapter } from '../../../shared/HexaInjection';

@Injectable()
export class SkillsService {
  constructor(
    @Inject(SkillsHexa)
    private readonly skillsHexa: SkillsHexa,
    @InjectDeploymentAdapter()
    private readonly deploymentAdapter: IDeploymentPort,
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
      spaceId,
      organizationId,
      userId,
      source,
    });
  }

  async getLatestVersionNumber(
    skillId: SkillId,
    spaceId: SpaceId,
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<number | null> {
    const adapter = this.skillsHexa.getAdapter();
    const { skillVersion } = await adapter.getLatestSkillVersionUseCase({
      skillId,
      spaceId,
      organizationId,
      userId,
    });
    return skillVersion?.version ?? null;
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

  async downloadSkillZipForAgent(
    skillId: SkillId,
    spaceId: SpaceId,
    organizationId: OrganizationId,
    userId: UserId,
    agent: CodingAgent,
  ): Promise<DownloadSkillZipForAgentResponse> {
    return this.deploymentAdapter.downloadSkillZipForAgent({
      skillId,
      spaceId,
      organizationId,
      userId,
      agent,
    });
  }

  async deleteSkillsBatch(
    skillIds: SkillId[],
    spaceId: SpaceId,
    organizationId: OrganizationId,
    userId: UserId,
    source: ClientSource,
  ): Promise<DeleteSkillsBatchResponse> {
    return this.skillsHexa.getAdapter().deleteSkillsBatch({
      skillIds,
      spaceId,
      organizationId,
      userId,
      source,
    });
  }
}
