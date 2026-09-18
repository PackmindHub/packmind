import { PackmindLogger } from '@packmind/logger';
import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import {
  IAccountsPort,
  IAccountsPortName,
  ILlmPort,
  ILlmPortName,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { LlmAdapter } from './application/adapter/LlmAdapter';

const origin = 'LlmHexa';

export class LlmHexa extends BaseHexa<BaseHexaOpts, ILlmPort> {
  private readonly adapter: LlmAdapter;
  public isInitialized = false;

  constructor(
    dataSource: DataSource,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);
    this.logger.info('Constructing LlmHexa');

    try {
      this.logger.debug('Creating LlmAdapter');
      this.adapter = new LlmAdapter(this.dataSource);

      this.logger.info('LlmHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct LlmHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async initialize(registry: HexaRegistry): Promise<void> {
    if (this.isInitialized) {
      this.logger.debug('LlmHexa already initialized');
      return;
    }

    this.logger.info('Initializing LlmHexa (adapter retrieval phase)');

    try {
      const accountsPort =
        registry.getAdapter<IAccountsPort>(IAccountsPortName);

      this.logger.info('Required ports retrieved from registry');

      await this.adapter.initialize({
        [IAccountsPortName]: accountsPort,
      });

      this.isInitialized = true;
      this.logger.info('LlmHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize LlmHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public getAdapter(): ILlmPort {
    if (!this.isInitialized) {
      this.logger.warn(
        'LlmHexa.getAdapter() called before initialization completed',
      );
    }
    return this.adapter.getPort();
  }

  public getPortName(): string {
    return ILlmPortName;
  }

  public destroy(): void {
    this.logger.info('Destroying LlmHexa');
    this.logger.info('LlmHexa destroyed');
  }
}
