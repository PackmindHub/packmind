import { OrganizationId } from '../../accounts/Organization';
import { UserId } from '../../accounts/User';
import type { QueryOption } from '../../database/types';
import { SpaceId } from '../../spaces/SpaceId';
import { Skill } from '../Skill';
import { SkillFile } from '../SkillFile';
import { SkillId } from '../SkillId';
import { SkillVersion } from '../SkillVersion';
import { SkillVersionId } from '../SkillVersionId';
import { SaveSkillVersionCommand } from '../contracts/SaveSkillVersionUseCase';
import {
  DeleteSkillCommand,
  UploadSkillCommand,
  UploadSkillResponse,
} from '../contracts';

export const ISkillsPortName = 'ISkillsPort' as const;

export interface ISkillsPort {
  getSkill(id: SkillId): Promise<Skill | null>;
  /**
   * Batch read of skills by IDs (mirrors getSkill for a set of IDs).
   */
  getSkillsByIds(ids: SkillId[]): Promise<Skill[]>;
  getSkillVersion(id: SkillVersionId): Promise<SkillVersion | null>;
  getLatestSkillVersion(skillId: SkillId): Promise<SkillVersion | null>;
  getSkillVersionByNumber(
    skillId: SkillId,
    version: number,
    allowedSpaceIds: SpaceId[],
  ): Promise<SkillVersion | null>;
  listSkillVersions(skillId: SkillId): Promise<SkillVersion[]>;
  listSkillsBySpace(
    spaceId: SpaceId,
    organizationId: OrganizationId,
    userId: string,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<Skill[]>;
  /**
   * List all skills across every space of an organization, without space
   * membership checks. Intended for organization-scoped aggregations
   * (e.g. governance drift) where the caller has already been authorized at
   * the organization level.
   */
  listAllSkillsByOrganization(organizationId: OrganizationId): Promise<Skill[]>;
  /**
   * Count skills grouped by space ID, omitting spaces with zero skills.
   * Used for management listing aggregations.
   */
  countBySpaceIds(spaceIds: SpaceId[]): Promise<Map<SpaceId, number>>;
  findSkillBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<Skill | null>;
  getSkillFiles(skillVersionId: SkillVersionId): Promise<SkillFile[]>;
  saveSkillVersion(command: SaveSkillVersionCommand): Promise<SkillVersion>;
  uploadSkill(command: UploadSkillCommand): Promise<UploadSkillResponse>;
  deleteSkill(command: DeleteSkillCommand): Promise<{ success: boolean }>;
  hardDeleteSkill(skillId: SkillId): Promise<void>;
  hardDeleteSkillVersion(versionId: SkillVersionId): Promise<void>;
  duplicateSkillToSpace(
    skillId: SkillId,
    destinationSpaceId: SpaceId,
    newUserId: UserId,
  ): Promise<Skill>;
  markSkillAsMoved(
    skillId: SkillId,
    destinationSpaceId: SpaceId,
  ): Promise<void>;
}
