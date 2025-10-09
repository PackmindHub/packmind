import { Injectable } from '@nestjs/common';
import {
  Target,
  TargetWithRepository,
  GetTargetsByGitRepoCommand,
  GetTargetsByRepositoryCommand,
  GetTargetsByOrganizationCommand,
  AddTargetCommand,
  UpdateTargetCommand,
  DeleteTargetCommand,
  DeleteTargetResponse,
} from '@packmind/shared';
import { IDeploymentPort } from '@packmind/shared';
import { DeploymentsHexa } from '@packmind/deployments';
import { AccountsHexa } from '@packmind/accounts';

@Injectable()
export class TargetsService {
  private readonly deploymentAdapter: IDeploymentPort;

  constructor(
    private readonly deploymentsHexa: DeploymentsHexa,
    private readonly accountsHexa: AccountsHexa,
  ) {
    this.deploymentsHexa.setAccountProviders(
      this.accountsHexa.getUserProvider(),
      this.accountsHexa.getOrganizationProvider(),
    );
    this.deploymentAdapter = this.deploymentsHexa.getDeploymentsUseCases();
  }

  async getTargetsByGitRepo(
    command: GetTargetsByGitRepoCommand,
  ): Promise<Target[]> {
    return this.deploymentAdapter.getTargetsByGitRepo(command);
  }

  async getTargetsByRepository(
    command: GetTargetsByRepositoryCommand,
  ): Promise<TargetWithRepository[]> {
    return this.deploymentAdapter.getTargetsByRepository(command);
  }

  async getTargetsByOrganization(
    command: GetTargetsByOrganizationCommand,
  ): Promise<TargetWithRepository[]> {
    return this.deploymentAdapter.getTargetsByOrganization(command);
  }

  async addTarget(command: AddTargetCommand): Promise<Target> {
    return this.deploymentAdapter.addTarget(command);
  }

  async updateTarget(command: UpdateTargetCommand): Promise<Target> {
    return this.deploymentAdapter.updateTarget(command);
  }

  async deleteTarget(
    command: DeleteTargetCommand,
  ): Promise<DeleteTargetResponse> {
    return this.deploymentAdapter.deleteTarget(command);
  }
}
