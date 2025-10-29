import { Injectable } from '@nestjs/common';
import {
  RuleId,
  Standard,
  StandardId,
  StandardsHexa,
  StandardVersion,
} from '@packmind/standards';
import { OrganizationId, UserId } from '@packmind/accounts';
import {
  IDeploymentPort,
  ILinterPort,
  PackmindLogger,
  PublishStandardsCommand,
  StandardsDeployment,
  SpaceId,
  ListStandardsBySpaceResponse,
  GetStandardByIdResponse,
} from '@packmind/shared';
import { DeploymentsHexa } from '@packmind/deployments';
import { LinterHexa, LinterAdapter } from '@packmind/linter';

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

    const linterUseCases = this.linterHexa.getLinterUsecases();
    this.linterAdapter = new LinterAdapter(linterUseCases);
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
    spaceId?: SpaceId,
  ): Promise<Standard> {
    // If spaceId not provided, fetch the existing standard to retrieve it
    // This supports backward compatibility with flat endpoints
    let resolvedSpaceId = spaceId;
    if (!resolvedSpaceId) {
      const standards =
        await this.standardsHexa.listStandardsByOrganization(organizationId);
      const existingStandard = standards.find((s) => s.id === standardId);

      if (!existingStandard) {
        throw new Error(`Standard with id ${standardId} not found`);
      }

      resolvedSpaceId = existingStandard.spaceId;
    }

    return this.standardsHexa.updateStandard({
      standardId,
      ...standard,
      scope: standard.scope || null,
      organizationId,
      userId: userId.toString(),
      spaceId: resolvedSpaceId,
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
