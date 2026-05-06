import { PackmindLogger } from '@packmind/logger';
import {
  BaseHexa,
  BaseHexaOpts,
  Cache,
  HexaRegistry,
} from '@packmind/node-utils';
import {
  IAccountsPort,
  IAccountsPortName,
  ITelemetryPort,
  ITelemetryPortName,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { TelemetryAdapter } from './application/adapter/TelemetryAdapter';
import { ITelemetryEventRepository } from './domain/repositories/ITelemetryEventRepository';
import { TelemetryEventRepository } from './infra/repositories/TelemetryEventRepository';

const origin = 'TelemetryHexa';

export type TelemetryHexaOpts = BaseHexaOpts & {
  repository?: ITelemetryEventRepository;
};

const baseTelemetryHexaOpts = { logger: new PackmindLogger(origin) };

/**
 * TelemetryHexa - Facade for the Telemetry domain.
 *
 * Stores OpenTelemetry log batches in Redis (per-org bounded ring buffer with
 * a 14-day TTL). Has no database tables and no cross-domain dependencies
 * beyond the Accounts port (used by `AbstractMemberUseCase` for membership
 * validation).
 */
export class TelemetryHexa extends BaseHexa<TelemetryHexaOpts, ITelemetryPort> {
  private readonly adapter: TelemetryAdapter;

  constructor(dataSource: DataSource, opts?: Partial<TelemetryHexaOpts>) {
    super(dataSource, { ...baseTelemetryHexaOpts, ...opts });
    this.logger.info('Constructing TelemetryHexa');

    const repository: ITelemetryEventRepository =
      opts?.repository ??
      new TelemetryEventRepository(Cache.getInstance().getRawClient());

    this.adapter = new TelemetryAdapter(repository);
    this.logger.info('TelemetryHexa construction completed');
  }

  public async initialize(registry: HexaRegistry): Promise<void> {
    this.logger.info('Initializing TelemetryHexa (adapter retrieval phase)');

    const accountsPort = registry.getAdapter<IAccountsPort>(IAccountsPortName);

    await this.adapter.initialize({
      [IAccountsPortName]: accountsPort,
    });

    this.logger.info('TelemetryHexa initialized successfully');
  }

  public getAdapter(): ITelemetryPort {
    return this.adapter.getPort();
  }

  public getPortName(): string {
    return ITelemetryPortName;
  }

  public destroy(): void {
    this.logger.info('Destroying TelemetryHexa');
  }
}
