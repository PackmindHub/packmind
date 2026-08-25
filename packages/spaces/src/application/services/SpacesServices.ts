import { SpaceService } from './SpaceService';
import { UserSpaceMembershipService } from './UserSpaceMembershipService';
import { instrumentComponents } from '@packmind/node-utils';
import { ISpacesRepositories } from '../../domain/repositories/ISpacesRepositories';

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
  private readonly userSpaceMembershipService: UserSpaceMembershipService;

  constructor(private readonly spacesRepositories: ISpacesRepositories) {
    // Initialize all services with their respective repositories from the aggregator
    this.spaceService = new SpaceService(
      this.spacesRepositories.getSpaceRepository(),
    );
    this.userSpaceMembershipService = new UserSpaceMembershipService(
      this.spacesRepositories.getUserSpaceMembershipRepository(),
      this.spacesRepositories.getSpaceRepository(),
    );

    // Services are where the domain logic that is not a query lives, and they
    // have no shared base class to hook - so the aggregator is the seam.
    instrumentComponents([this.spaceService, this.userSpaceMembershipService]);
  }

  getSpaceService(): SpaceService {
    return this.spaceService;
  }

  getUserSpaceMembershipService(): UserSpaceMembershipService {
    return this.userSpaceMembershipService;
  }
}
