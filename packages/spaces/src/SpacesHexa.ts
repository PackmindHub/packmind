import { DataSource } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import {
  BaseHexa,
  HexaRegistry,
  BaseHexaOpts,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  IAccountsPort,
  IAccountsPortName,
  ISpacesPort,
  ISpacesPortName,
} from '@packmind/types';
import { SpacesAdapter } from './application/adapters/SpacesAdapter';
import { SpacesRepositories } from './infra/repositories/SpacesRepositories';
import { SpacesServices } from './application/services/SpacesServices';
import { SpaceService } from './application/services/SpaceService';

import { UserSpaceMembershipService } from './application/services/UserSpaceMembershipService';

const origin = 'SpacesHexa';

export class SpacesHexa extends BaseHexa<BaseHexaOpts, ISpacesPort> {
  private readonly spacesRepositories: SpacesRepositories;
  private readonly spacesServices: SpacesServices;
  private readonly spacesAdapter: SpacesAdapter;

  constructor(
    dataSource: DataSource,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);
    this.logger.info('Constructing SpacesHexa');

    try {
      this.spacesRepositories = new SpacesRepositories(this.dataSource);
      this.spacesServices = new SpacesServices(this.spacesRepositories);
      this.spacesAdapter = new SpacesAdapter(this);

      this.logger.info('SpacesHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct SpacesHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async initialize(registry: HexaRegistry): Promise<void> {
    this.logger.info('Initializing SpacesHexa (adapter retrieval phase)');

    try {
      const accountsPort =
        registry.getAdapter<IAccountsPort>(IAccountsPortName);
      const eventEmitterService = registry.getService(
        PackmindEventEmitterService,
      );

      await this.spacesAdapter.initialize({
        [IAccountsPortName]: accountsPort,
        eventEmitterService,
      });

      this.logger.info('SpacesHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize SpacesHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  destroy(): void {
    this.logger.info('Destroying SpacesHexa');
    this.logger.info('SpacesHexa destroyed');
  }

  public getAdapter(): ISpacesPort {
    return this.spacesAdapter.getPort();
  }

  public getPortName(): string {
    return ISpacesPortName;
  }

  public getSpaceService(): SpaceService {
    return this.spacesServices.getSpaceService();
  }

  public getUserSpaceMembershipService(): UserSpaceMembershipService {
    return this.spacesServices.getUserSpaceMembershipService();
  }
}
