import { PackmindLogger } from '@packmind/logger';
import { IBaseAdapter } from '@packmind/node-utils';
import {
  IAccountsPort,
  IAccountsPortName,
  ITelemetryPort,
  IngestTelemetryEventsCommand,
  IngestTelemetryEventsResponse,
  ListRecentTelemetryEventsCommand,
  ListRecentTelemetryEventsResponse,
} from '@packmind/types';
import { ITelemetryEventRepository } from '../../domain/repositories/ITelemetryEventRepository';
import { IngestTelemetryEventsUseCase } from '../useCases/ingestTelemetryEvents/IngestTelemetryEventsUseCase';
import { ListRecentTelemetryEventsUseCase } from '../useCases/listRecentTelemetryEvents/ListRecentTelemetryEventsUseCase';

const origin = 'TelemetryAdapter';

export class TelemetryAdapter
  implements IBaseAdapter<ITelemetryPort>, ITelemetryPort
{
  private accountsPort: IAccountsPort | null = null;
  private _ingestUseCase!: IngestTelemetryEventsUseCase;
  private _listRecentUseCase!: ListRecentTelemetryEventsUseCase;

  constructor(
    private readonly repository: ITelemetryEventRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info(
      'TelemetryAdapter constructed - awaiting initialization with ports',
    );
  }

  public async initialize(ports: {
    [IAccountsPortName]: IAccountsPort;
  }): Promise<void> {
    this.logger.info('Initializing TelemetryAdapter');
    const accountsPort = ports[IAccountsPortName];
    if (!accountsPort) {
      throw new Error('TelemetryAdapter: required ports not provided');
    }

    this.accountsPort = accountsPort;
    this._ingestUseCase = new IngestTelemetryEventsUseCase(
      accountsPort,
      this.repository,
    );
    this._listRecentUseCase = new ListRecentTelemetryEventsUseCase(
      accountsPort,
      this.repository,
    );

    this.logger.info('TelemetryAdapter initialized successfully');
  }

  public isReady(): boolean {
    return this.accountsPort !== null;
  }

  public getPort(): ITelemetryPort {
    return this;
  }

  async ingestTelemetryEvents(
    command: IngestTelemetryEventsCommand,
  ): Promise<IngestTelemetryEventsResponse> {
    return this._ingestUseCase.execute(command);
  }

  async listRecentTelemetryEvents(
    command: ListRecentTelemetryEventsCommand,
  ): Promise<ListRecentTelemetryEventsResponse> {
    return this._listRecentUseCase.execute(command);
  }
}
