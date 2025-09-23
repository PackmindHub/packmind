import { Injectable } from '@nestjs/common';
import {
  Target,
  TargetWithRepository,
  GetTargetsByRepositoryCommand,
  GetTargetsByOrganizationCommand,
  AddTargetCommand,
  UpdateTargetCommand,
  DeleteTargetCommand,
  DeleteTargetResponse,
} from '@packmind/shared';
import { IDeploymentPort } from '@packmind/shared';
import { DeploymentsHexa } from '@packmind/deployments';

@Injectable()
export class TargetsService {
  private readonly deploymentAdapter: IDeploymentPort;

  constructor(private readonly deploymentsHexa: DeploymentsHexa) {
    this.deploymentAdapter = this.deploymentsHexa.getDeploymentsUseCases();
  }

  async getTargetsByRepository(
    command: GetTargetsByRepositoryCommand,
  ): Promise<Target[]> {
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
