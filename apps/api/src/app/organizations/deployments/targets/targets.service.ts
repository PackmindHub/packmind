import { Injectable } from '@nestjs/common';
import {
  Target,
  TargetWithRepository,
  GetTargetsByOrganizationCommand,
  GetTargetsByRepositoryCommand,
  AddTargetCommand,
  UpdateTargetCommand,
  DeleteTargetCommand,
  DeleteTargetResponse,
  IDeploymentPort,
} from '@packmind/types';
import { InjectDeploymentAdapter } from '../../../shared/HexaInjection';

@Injectable()
export class TargetsService {
  constructor(
    @InjectDeploymentAdapter()
    private readonly deploymentAdapter: IDeploymentPort,
  ) {}

  async getTargetsByOrganization(
    command: GetTargetsByOrganizationCommand,
  ): Promise<TargetWithRepository[]> {
    return this.deploymentAdapter.getTargetsByOrganization(command);
  }

  async getTargetsByRepository(
    command: GetTargetsByRepositoryCommand,
  ): Promise<TargetWithRepository[]> {
    return this.deploymentAdapter.getTargetsByRepository(command);
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
