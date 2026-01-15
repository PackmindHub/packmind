import { Injectable } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import { StandardsHexa } from '@packmind/standards';
import {
  Distribution,
  GetStandardByIdResponse,
  IDeploymentPort,
  ListStandardsBySpaceResponse,
  OrganizationId,
  PublishStandardsCommand,
  RuleId,
  SpaceId,
  Standard,
  StandardId,
  StandardVersion,
  UserId,
} from '@packmind/types';
import { InjectDeploymentAdapter } from '../../../shared/HexaInjection';

@Injectable()
export class StandardsService {
  constructor(
    private readonly standardsHexa: StandardsHexa,
    @InjectDeploymentAdapter()
    private readonly deploymentAdapter: IDeploymentPort,
    private readonly logger: PackmindLogger,
  ) {}

  async getStandardsBySpace(
    spaceId: SpaceId,
    organizationId: OrganizationId,
    userId: string,
  ): Promise<ListStandardsBySpaceResponse> {
    const standards = await this.standardsHexa
      .getAdapter()
      .listStandardsBySpace(spaceId, organizationId, userId);
    return { standards };
  }

  async getStandardById(
    id: StandardId,
    organizationId: OrganizationId,
    spaceId: SpaceId,
    userId: UserId,
  ): Promise<GetStandardByIdResponse> {
    return this.standardsHexa.getAdapter().getStandardById({
      standardId: id,
      organizationId,
      spaceId,
      userId,
    });
  }

  async createStandard(
    standard: {
      name: string;
      description: string;
      rules: Array<{ content: string }>;
      scope?: string | null;
    },
    organizationId: OrganizationId,
    userId: UserId,
    spaceId: SpaceId,
  ): Promise<Standard> {
    return this.standardsHexa.getAdapter().createStandard({
      ...standard,
      scope: standard.scope || null,
      organizationId,
      userId,
      spaceId,
    });
  }

  async updateStandard(
    standardId: StandardId,
    standard: {
      name: string;
      description: string;
      rules: Array<{ id: RuleId; content: string }>;
      scope?: string | null;
    },
    organizationId: OrganizationId,
    userId: UserId,
    spaceId: SpaceId,
  ): Promise<Standard> {
    return this.standardsHexa.getAdapter().updateStandard({
      standardId,
      ...standard,
      scope: standard.scope || null,
      organizationId,
      userId: userId.toString(),
      spaceId,
    });
  }

  async getStandardVersionsById(id: StandardId): Promise<StandardVersion[]> {
    return this.standardsHexa.getAdapter().listStandardVersions(id);
  }

  async deployStandardsToGit(
    command: PublishStandardsCommand,
  ): Promise<Distribution[]> {
    const result = await this.deploymentAdapter.publishArtifacts({
      ...command,
      recipeVersionIds: [],
      packagesSlugs: [],
      packageIds: [],
    });
    return result.distributions;
  }

  async deleteStandard(
    id: StandardId,
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<void> {
    return this.standardsHexa
      .getAdapter()
      .deleteStandard(id, userId, organizationId);
  }

  async deleteStandardsBatch(
    standardIds: StandardId[],
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<void> {
    return this.standardsHexa
      .getAdapter()
      .deleteStandardsBatch(standardIds, userId, organizationId);
  }
}
