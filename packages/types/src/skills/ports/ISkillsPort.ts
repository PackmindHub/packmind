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
