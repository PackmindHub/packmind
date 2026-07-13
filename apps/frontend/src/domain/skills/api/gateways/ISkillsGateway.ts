import {
  DeleteSkillsBatchResponse,
  OrganizationId,
  Skill,
  SkillId,
  SkillVersion,
  SkillWithFiles,
  SpaceId,
  UpdateSkillFileFromUIResponse,
} from '@packmind/types';

export interface ISkillsGateway {
  getSkills(organizationId: OrganizationId, spaceId: SpaceId): Promise<Skill[]>;
  getSkillBySlug(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    slug: string,
  ): Promise<SkillWithFiles | null>;
  getSkillWithFilesById(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    skillId: SkillId,
  ): Promise<SkillWithFiles | null>;
  getSkillVersions(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    skillId: SkillId,
  ): Promise<SkillVersion[]>;
  deleteSkill(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    skillId: SkillId,
  ): Promise<void>;
  deleteSkillsBatch(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    skillIds: SkillId[],
  ): Promise<DeleteSkillsBatchResponse>;
  updateSkillFile(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    skillId: SkillId,
    params: { filePath: string; content: string },
  ): Promise<UpdateSkillFileFromUIResponse>;
}
