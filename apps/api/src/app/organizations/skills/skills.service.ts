import { Injectable } from '@nestjs/common';
import {
  DeployDefaultSkillsCommand,
  DeployDefaultSkillsResponse,
  IDeploymentPort,
} from '@packmind/types';
import { InjectDeploymentAdapter } from '../../shared/HexaInjection';

@Injectable()
export class OrganizationSkillsService {
  constructor(
    @InjectDeploymentAdapter()
    private readonly deploymentAdapter: IDeploymentPort,
  ) {}

  async deployDefaultSkills(
    command: DeployDefaultSkillsCommand,
  ): Promise<DeployDefaultSkillsResponse> {
    return this.deploymentAdapter.deployDefaultSkills(command);
  }
}
