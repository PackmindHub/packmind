import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import { IMarketplacePort, IMarketplacePortName } from '@packmind/types';
import { DataSource } from 'typeorm';
import { MarketplacesAdapter } from './MarketplacesAdapter';

export class MarketplacesHexa extends BaseHexa<BaseHexaOpts, IMarketplacePort> {
  private readonly marketplacesAdapter: MarketplacesAdapter;

  constructor(dataSource: DataSource) {
    super(dataSource);

    // OSS edition: provide stub implementation of IMarketplacePort
    this.marketplacesAdapter = new MarketplacesAdapter();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initialize(_registry: HexaRegistry): Promise<void> {
    // No adapters needed for OSS edition
  }

  public getAdapter(): IMarketplacePort {
    return this.marketplacesAdapter;
  }

  public getPortName(): string {
    return IMarketplacePortName;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  destroy(): void {}
}
