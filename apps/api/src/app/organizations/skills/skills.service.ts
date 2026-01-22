import { Injectable } from '@nestjs/common';
import {
  DeployDefaultSkillsCommand,
  DeployDefaultSkillsResponse,
  DownloadDefaultSkillsZipFileCommand,
  DownloadDefaultSkillsZipFileResponse,
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

  async downloadDefaultSkillsZip(
    command: DownloadDefaultSkillsZipFileCommand,
  ): Promise<DownloadDefaultSkillsZipFileResponse> {
    return this.deploymentAdapter.downloadDefaultSkillsZipFile(command);
  }
}
