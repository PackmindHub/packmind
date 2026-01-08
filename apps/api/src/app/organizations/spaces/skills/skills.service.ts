import { Injectable } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import { SkillsHexa } from '@packmind/skills';
import {
  GetSkillByIdResponse,
  ListSkillsBySpaceResponse,
  OrganizationId,
  Skill,
  SkillId,
  SkillVersion,
  SpaceId,
  UserId,
} from '@packmind/types';

@Injectable()
export class SkillsService {
  constructor(
    private readonly skillsHexa: SkillsHexa,
    private readonly logger: PackmindLogger,
  ) {}

  async getSkillsBySpace(
    spaceId: SpaceId,
    organizationId: OrganizationId,
    userId: string,
  ): Promise<ListSkillsBySpaceResponse> {
    const skills = await this.skillsHexa
      .getAdapter()
      .listSkillsBySpace(spaceId, organizationId, userId);
    return skills;
  }

  async getSkillById(
    id: SkillId,
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<GetSkillByIdResponse> {
    return this.skillsHexa.getAdapter().getSkillById({
      skillId: id,
      organizationId,
      userId,
    });
  }

  async createSkill(
    skill: {
      name: string;
      description: string;
      prompt: string;
      license?: string;
      compatibility?: string;
      metadata?: Record<string, string>;
      allowedTools?: string;
    },
    organizationId: OrganizationId,
    userId: UserId,
    spaceId: SpaceId,
  ): Promise<Skill> {
    return this.skillsHexa.getAdapter().createSkill({
      name: skill.name,
      description: skill.description,
      prompt: skill.prompt,
      license: skill.license,
      compatibility: skill.compatibility,
      metadata: skill.metadata,
      allowedTools: skill.allowedTools,
      organizationId,
      userId,
      spaceId,
    });
  }

  async updateSkill(
    skillId: SkillId,
    skill: {
      name: string;
      description: string;
      prompt: string;
      license?: string;
      compatibility?: string;
      metadata?: Record<string, string>;
      allowedTools?: string;
    },
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<Skill> {
    return this.skillsHexa.getAdapter().updateSkill({
      skillId,
      name: skill.name,
      description: skill.description,
      prompt: skill.prompt,
      license: skill.license,
      compatibility: skill.compatibility,
      metadata: skill.metadata,
      allowedTools: skill.allowedTools,
      organizationId,
      userId,
    });
  }

  async getSkillVersionsById(id: SkillId): Promise<SkillVersion[]> {
    return this.skillsHexa.getAdapter().listSkillVersions(id);
  }

  async deleteSkill(
    id: SkillId,
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<{ success: boolean }> {
    return this.skillsHexa.getAdapter().deleteSkill({
      skillId: id,
      userId,
      organizationId,
    });
  }
}
