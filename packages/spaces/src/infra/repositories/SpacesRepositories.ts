import { DataSource } from 'typeorm';
import { ISpacesRepositories } from '../../domain/repositories/ISpacesRepositories';
import { ISpaceRepository } from '../../domain/repositories/ISpaceRepository';
import { SpaceRepository } from './SpaceRepository';
import { SpaceSchema } from '../schemas/SpaceSchema';

/**
 * SpacesRepositories - Repository aggregator implementation for the Spaces domain
 *
 * This class serves as the main repository access point, aggregating all
 * individual repositories. It handles the instantiation of repositories
 * using the shared DataSource and provides them through getter methods.
 */
export class SpacesRepositories implements ISpacesRepositories {
  private readonly spaceRepository: ISpaceRepository;

  constructor(private readonly dataSource: DataSource) {
    // Initialize all repositories with their respective schemas
    this.spaceRepository = new SpaceRepository(
      this.dataSource.getRepository(SpaceSchema),
    );
  }

  getSpaceRepository(): ISpaceRepository {
    return this.spaceRepository;
  }
}
