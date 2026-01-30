import { SpaceService } from './SpaceService';
import { ISpacesRepositories } from '../../domain/repositories/ISpacesRepositories';
import { PackmindLogger } from '@packmind/logger';

/**
 * SpacesServices - Service aggregator for the Spaces application layer
 *
 * This class serves as the main service access point, aggregating all
 * individual services. It handles the instantiation of services
 * using the repository aggregator and provides them through getter methods.
 *
 * Note: Service aggregators do not need interfaces as they are internal
 * implementation details, unlike repository aggregators which implement domain contracts.
 */
export class SpacesServices {
  private readonly spaceService: SpaceService;

  constructor(private readonly spacesRepositories: ISpacesRepositories) {
    // Initialize all services with their respective repositories from the aggregator
    this.spaceService = new SpaceService(
      this.spacesRepositories.getSpaceRepository(),
    );
  }

  getSpaceService(): SpaceService {
    return this.spaceService;
  }
}
