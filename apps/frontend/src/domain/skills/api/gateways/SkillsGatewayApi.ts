import {
  DeleteSkillsBatchResponse,
  OrganizationId,
  Skill,
  SkillId,
  SkillVersion,
  SkillWithFiles,
  SpaceId,
  UpdateSkillFileFromUIResponse,
  UploadSkillFileInput,
  UploadSkillResponse,
} from '@packmind/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { ISkillsGateway } from './ISkillsGateway';

/**
 * A skill upload carries every one of its files inline, so it is orders of
 * magnitude larger than anything else this app sends — up to the API's 15 MB
 * body limit. The 10 s default in ApiService is a reasonable ceiling for a JSON
 * round-trip but not for a multi-megabyte body: on a slow uplink axios aborts a
 * transfer that is progressing perfectly well, and an aborted XHR carries no
 * response, so the failure reaches the user as "Network Error: No response from
 * server" rather than anything about size or speed.
 */
export const UPLOAD_SKILL_TIMEOUT_MS = 180_000;

export class SkillsGatewayApi
  extends PackmindGateway
  implements ISkillsGateway
{
  constructor() {
    super('/skills');
  }

  async getSkills(
    organizationId: OrganizationId,
    spaceId: SpaceId,
  ): Promise<Skill[]> {
    return this._api.get<Skill[]>(
      `/organizations/${organizationId}/spaces/${spaceId}/skills`,
    );
  }

  async getSkillBySlug(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    slug: string,
  ): Promise<SkillWithFiles | null> {
    return this._api.get<SkillWithFiles | null>(
      `/organizations/${organizationId}/spaces/${spaceId}/skills/${slug}`,
    );
  }

  async getSkillWithFilesById(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    skillId: SkillId,
  ): Promise<SkillWithFiles | null> {
    return this._api.get<SkillWithFiles | null>(
      `/organizations/${organizationId}/spaces/${spaceId}/skills/${skillId}/detail`,
    );
  }

  async getSkillVersions(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    skillId: SkillId,
  ): Promise<SkillVersion[]> {
    return this._api.get<SkillVersion[]>(
      `/organizations/${organizationId}/spaces/${spaceId}/skills/${skillId}/versions`,
    );
  }

  async deleteSkill(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    skillId: SkillId,
  ): Promise<void> {
    return this._api.delete<void>(
      `/organizations/${organizationId}/spaces/${spaceId}/skills/${skillId}`,
    );
  }

  async deleteSkillsBatch(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    skillIds: SkillId[],
  ): Promise<DeleteSkillsBatchResponse> {
    return this._api.post<DeleteSkillsBatchResponse>(
      `/organizations/${organizationId}/spaces/${spaceId}/skills/delete`,
      { skillIds },
    );
  }

  async updateSkillFile(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    skillId: SkillId,
    params: { filePath: string; content: string },
  ): Promise<UpdateSkillFileFromUIResponse> {
    return this._api.patch<UpdateSkillFileFromUIResponse>(
      `/organizations/${organizationId}/spaces/${spaceId}/skills/${skillId}/file`,
      params,
    );
  }

  async uploadSkill(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    files: UploadSkillFileInput[],
    originSkill?: string,
  ): Promise<UploadSkillResponse> {
    return this._api.post<UploadSkillResponse>(
      `/organizations/${organizationId}/spaces/${spaceId}/skills/upload`,
      { files, ...(originSkill ? { originSkill } : {}) },
      { timeout: UPLOAD_SKILL_TIMEOUT_MS },
    );
  }
}
