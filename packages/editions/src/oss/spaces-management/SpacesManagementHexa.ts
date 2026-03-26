import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import {
  ISpacesManagementPort,
  ISpacesManagementPortName,
  ISpacesPort,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { SpacesManagementAdapter } from './SpacesManagementAdapter';

export class SpacesManagementHexa extends BaseHexa<
  BaseHexaOpts,
  ISpacesManagementPort
> {
  private readonly spacesManagementAdapter: SpacesManagementAdapter;

  constructor(dataSource: DataSource) {
    super(dataSource);

    // OSS edition: provide stub implementation of ISpacesManagementPort
    this.spacesManagementAdapter = new SpacesManagementAdapter();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initialize(_registry: HexaRegistry): Promise<void> {
    // No adapters needed for OSS edition
  }

  public getAdapter(): ISpacesManagementPort {
    return this.spacesManagementAdapter;
  }

  public getSpacesPort(): ISpacesPort {
    throw new Error('SpacesPort not available in OSS edition');
  }

  public getPortName(): string {
    return ISpacesManagementPortName;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  destroy(): void {}
}
