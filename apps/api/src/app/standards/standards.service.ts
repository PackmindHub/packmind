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
  PackmindLogger,
  PublishStandardsCommand,
  StandardsDeployment,
} from '@packmind/shared';
import { DeploymentsHexa } from '@packmind/deployments';

@Injectable()
export class StandardsService {
  private readonly deploymentAdapter: IDeploymentPort;

  constructor(
    private readonly deploymentHexa: DeploymentsHexa,
    private readonly standardsHexa: StandardsHexa,
    private readonly logger: PackmindLogger,
  ) {
    this.deploymentAdapter = this.deploymentHexa.getDeploymentsUseCases();
    this.standardsHexa.setDeploymentsQueryAdapter(this.deploymentAdapter);
  }

  async getStandardsByOrganization(
    organizationId: OrganizationId,
  ): Promise<Standard[]> {
    return this.standardsHexa.listStandardsByOrganization(organizationId);
  }

  async getStandardById(id: StandardId): Promise<Standard | null> {
    return this.standardsHexa.getStandardById(id);
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
  ): Promise<Standard> {
    return this.standardsHexa.createStandard({
      ...standard,
      scope: standard.scope || null,
      organizationId,
      userId,
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
  ): Promise<Standard> {
    return this.standardsHexa.updateStandard({
      standardId,
      ...standard,
      scope: standard.scope || null,
      organizationId,
      userId,
    });
  }

  async getStandardVersionsById(id: StandardId): Promise<StandardVersion[]> {
    return this.standardsHexa.listStandardVersions(id);
  }

  async deployStandardsToGit(
    command: PublishStandardsCommand,
  ): Promise<StandardsDeployment> {
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
