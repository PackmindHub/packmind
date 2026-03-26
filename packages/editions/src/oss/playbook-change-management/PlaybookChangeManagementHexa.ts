import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import {
  IPlaybookChangeManagementPort,
  IPlaybookChangeManagementPortName,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { PlaybookChangeManagementAdapter } from './PlaybookChangeManagementAdapter';

export class PlaybookChangeManagementHexa extends BaseHexa<
  BaseHexaOpts,
  IPlaybookChangeManagementPort
> {
  private readonly adapter: PlaybookChangeManagementAdapter;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.adapter = new PlaybookChangeManagementAdapter();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initialize(registry: HexaRegistry): Promise<void> {
    // No adapters needed for OSS edition
  }

  public getAdapter(): IPlaybookChangeManagementPort {
    return this.adapter;
  }

  getPortName(): string {
    return IPlaybookChangeManagementPortName;
  }

  async cleanup(): Promise<void> {
    // Nothing to cleanup in OSS edition
  }

  destroy(): void {
    /* empty */
  }
}
