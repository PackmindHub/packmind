import { Injectable } from '@nestjs/common';
import { OrganizationId, UserId } from '@packmind/accounts';
import { DeploymentsHexa } from '@packmind/deployments';
import { LinterHexa } from '@packmind/linter';
import { PackmindLogger } from '@packmind/logger';
import {
  RuleId,
  Standard,
  StandardId,
  StandardsHexa,
  StandardVersion,
} from '@packmind/standards';
import {
  GetStandardByIdResponse,
  IDeploymentPort,
  ILinterPort,
  ListStandardsBySpaceResponse,
  PublishStandardsCommand,
  SpaceId,
  StandardsDeployment,
} from '@packmind/types';

@Injectable()
export class StandardsService {
  private readonly deploymentAdapter: IDeploymentPort;
  private readonly linterAdapter: ILinterPort;

  constructor(
    private readonly deploymentHexa: DeploymentsHexa,
    private readonly linterHexa: LinterHexa,
    private readonly standardsHexa: StandardsHexa,
    private readonly logger: PackmindLogger,
  ) {
    this.deploymentAdapter = this.deploymentHexa.getDeploymentsUseCases();
    this.standardsHexa.setDeploymentsQueryAdapter(this.deploymentAdapter);

    this.linterAdapter = this.linterHexa.getLinterAdapter();
    this.standardsHexa.setLinterAdapter(this.linterAdapter);

    // Set up bidirectional dependency - LinterHexa needs StandardsAdapter
    const standardsAdapter = this.standardsHexa.getStandardsAdapter();
    this.linterHexa.setStandardAdapter(standardsAdapter);
  }

  async getStandardsBySpace(
    spaceId: SpaceId,
    organizationId: OrganizationId,
    userId: string,
  ): Promise<ListStandardsBySpaceResponse> {
    return this.standardsHexa.listStandardsBySpace({
      spaceId,
      organizationId,
      userId,
    });
  }

  async getStandardById(
    id: StandardId,
    organizationId: OrganizationId,
    spaceId: SpaceId,
    userId: UserId,
  ): Promise<GetStandardByIdResponse> {
    return this.standardsHexa.getStandardById({
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
    spaceId: SpaceId | null,
  ): Promise<Standard> {
    return this.standardsHexa.createStandard({
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
    return this.standardsHexa.updateStandard({
      standardId,
      ...standard,
      scope: standard.scope || null,
      organizationId,
      userId: userId.toString(),
      spaceId,
    });
  }

  async getStandardVersionsById(id: StandardId): Promise<StandardVersion[]> {
    return this.standardsHexa.listStandardVersions(id);
  }

  async deployStandardsToGit(
    command: PublishStandardsCommand,
  ): Promise<StandardsDeployment[]> {
    return this.deploymentAdapter.publishStandards(command);
  }

  async deleteStandard(id: StandardId, userId: UserId): Promise<void> {
    return this.standardsHexa.deleteStandard(id, userId);
  }

  async deleteStandardsBatch(
    standardIds: StandardId[],
    userId: UserId,
  ): Promise<void> {
    return this.standardsHexa.deleteStandardsBatch(standardIds, userId);
  }
}
