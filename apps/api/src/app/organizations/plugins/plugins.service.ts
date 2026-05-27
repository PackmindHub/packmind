import { Injectable } from '@nestjs/common';
import {
  IDeploymentPort,
  RenderPackageAsPluginCommand,
  RenderPackageAsPluginResponse,
} from '@packmind/types';
import { InjectDeploymentAdapter } from '../../shared/HexaInjection';

@Injectable()
export class PluginsService {
  constructor(
    @InjectDeploymentAdapter()
    private readonly deploymentAdapter: IDeploymentPort,
  ) {}

  async renderPlugin(
    command: RenderPackageAsPluginCommand,
  ): Promise<RenderPackageAsPluginResponse> {
    return this.deploymentAdapter.renderPackageAsPlugin(command);
  }
}
