import { DataSource } from 'typeorm';
import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import { IAnalyticsPort, IAnalyticsPortName } from '@packmind/types';
import { AnalyticsAdapter } from './AnalyticsAdapter';

export type AnalyticsHexaOpts = BaseHexaOpts;

export class AnalyticsHexa extends BaseHexa<AnalyticsHexaOpts, IAnalyticsPort> {
  private readonly adapter: AnalyticsAdapter;

  constructor(dataSource: DataSource, opts?: Partial<AnalyticsHexaOpts>) {
    super(dataSource, opts);
    this.adapter = new AnalyticsAdapter();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initialize(registry: HexaRegistry): Promise<void> {
    // No adapters needed for OSS edition
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  destroy(): void {}

  /**
   * Returns the AnalyticsAdapter for cross-domain integration.
   */
  public getAdapter(): IAnalyticsPort {
    return this.adapter;
  }

  /**
   * Returns the port name for registry registration.
   */
  public getPortName(): string {
    return IAnalyticsPortName;
  }
}
