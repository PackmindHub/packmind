import { DataSource } from 'typeorm';
import { BaseHexa, HexaRegistry } from '@packmind/node-utils';

export class AnalyticsHexa extends BaseHexa {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initialize(registry: HexaRegistry): Promise<void> {
    // No adapters needed
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async trackRecipeUsage(command: {
    recipeSlugs: string[];
    aiAgent: string;
    userId: string;
    organizationId: string;
    gitRepo?: string;
    target?: string;
  }): Promise<never[]> {
    throw new Error(
      'Tracking recipes usage is not available in your version of Packmind. Upgrade to benefit from this feature.',
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  destroy(): void {}

  /**
   * AnalyticsHexa does not expose an adapter (no cross-domain port).
   */
  public getAdapter(): void {
    return undefined;
  }

  /**
   * Get the port name for this hexa.
   * AnalyticsHexa does not expose a port adapter.
   */
  public getPortName(): string {
    throw new Error('AnalyticsHexa does not expose a port adapter');
  }
}
