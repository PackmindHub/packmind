import { ISpacesServices } from '../ISpacesServices';
import { SpaceService } from './SpaceService';
import { ISpacesRepositories } from '../../domain/repositories/ISpacesRepositories';
import { PackmindLogger } from '@packmind/logger';

/**
 * SpacesServices - Service aggregator implementation for the Spaces application layer
 *
 * This class serves as the main service access point, aggregating all
 * individual services. It handles the instantiation of services
 * using the repository aggregator and provides them through getter methods.
 */
export class SpacesServices implements ISpacesServices {
  private readonly spaceService: SpaceService;

  constructor(
    private readonly spacesRepositories: ISpacesRepositories,
    private readonly logger: PackmindLogger,
  ) {
    // Initialize all services with their respective repositories from the aggregator
    this.spaceService = new SpaceService(
      this.spacesRepositories.getSpaceRepository(),
      this.logger,
    );
  }

  getSpaceService(): SpaceService {
    return this.spaceService;
  }
}
