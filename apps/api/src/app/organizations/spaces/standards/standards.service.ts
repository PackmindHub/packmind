import { Injectable } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import { StandardsHexa } from '@packmind/standards';
import {
  ClientSource,
  CreateStandardSamplesResponse,
  DeleteStandardCommand,
  DeleteStandardsBatchCommand,
  Distribution,
  GetStandardByIdResponse,
  IDeploymentPort,
  ListStandardsBySpaceResponse,
  OrganizationId,
  PublishStandardsCommand,
  RuleId,
  SampleInput,
  SpaceId,
  Standard,
  StandardCreationMethod,
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
    source: ClientSource,
    method: StandardCreationMethod,
  ): Promise<Standard> {
    return this.standardsHexa.getAdapter().createStandard({
      ...standard,
      scope: standard.scope || null,
      organizationId,
      userId,
      spaceId,
      source,
      method,
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
    source: ClientSource,
  ): Promise<Standard> {
    return this.standardsHexa.getAdapter().updateStandard({
      standardId,
      ...standard,
      scope: standard.scope || null,
      organizationId,
      userId: userId.toString(),
      spaceId,
      source,
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

  async deleteStandard(command: DeleteStandardCommand): Promise<void> {
    return this.standardsHexa.getAdapter().deleteStandard(command);
  }

  async deleteStandardsBatch(
    command: DeleteStandardsBatchCommand,
  ): Promise<void> {
    return this.standardsHexa.getAdapter().deleteStandardsBatch(command);
  }

  async createStandardSamples(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    userId: UserId,
    samples: SampleInput[],
  ): Promise<CreateStandardSamplesResponse> {
    return this.standardsHexa.getAdapter().createStandardSamples({
      organizationId,
      spaceId,
      userId,
      samples,
    });
  }
}
