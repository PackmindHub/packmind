import { ISpaceRepository } from './ISpaceRepository';

/**
 * ISpacesRepositories - Repository aggregator interface for the Spaces domain
 *
 * This interface serves as the main repository access point, aggregating all
 * individual repositories through getter methods. This pattern centralizes
 * repository instantiation and provides a clean dependency injection point.
 */
export interface ISpacesRepositories {
  /**
   * Get the space repository instance
   */
  getSpaceRepository(): ISpaceRepository;
}
