import { Injectable } from '@nestjs/common';
import {
  CodingAgent,
  DownloadDefaultSkillsZipForAgentResponse,
  IDeploymentPort,
} from '@packmind/types';
import { InjectDeploymentAdapter } from '../shared/HexaInjection';

@Injectable()
export class PublicSkillsService {
  constructor(
    @InjectDeploymentAdapter()
    private readonly deploymentAdapter: IDeploymentPort,
  ) {}

  async downloadDefaultSkillsZipForAgent(
    agent: CodingAgent,
  ): Promise<DownloadDefaultSkillsZipForAgentResponse> {
    return this.deploymentAdapter.downloadDefaultSkillsZipForAgent({ agent });
  }
}
