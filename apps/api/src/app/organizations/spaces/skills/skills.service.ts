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
    return { skills };
  }

  async getSkillById(
    id: SkillId,
    organizationId: OrganizationId,
    spaceId: SpaceId,
    userId: UserId,
  ): Promise<GetSkillByIdResponse> {
    return this.skillsHexa.getAdapter().getSkillById({
      skillId: id,
      organizationId,
      spaceId,
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
      ...skill,
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
    spaceId: SpaceId,
  ): Promise<Skill> {
    return this.skillsHexa.getAdapter().updateSkill({
      skillId,
      ...skill,
      organizationId,
      userId: userId.toString(),
      spaceId,
    });
  }

  async getSkillVersionsById(id: SkillId): Promise<SkillVersion[]> {
    return this.skillsHexa.getAdapter().listSkillVersions(id);
  }

  async deleteSkill(
    id: SkillId,
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<void> {
    return this.skillsHexa.getAdapter().deleteSkill(id, userId, organizationId);
  }
}
