import { DataSource } from 'typeorm';
import { ISpacesRepositories } from '../../domain/repositories/ISpacesRepositories';
import { ISpaceRepository } from '../../domain/repositories/ISpaceRepository';
import { IUserSpaceMembershipRepository } from '../../domain/repositories/IUserSpaceMembershipRepository';
import { SpaceRepository } from './SpaceRepository';
import { UserSpaceMembershipRepository } from './UserSpaceMembershipRepository';
import { SpaceSchema } from '../schemas/SpaceSchema';
import { UserSpaceMembershipSchema } from '../schemas/UserSpaceMembershipSchema';

/**
 * SpacesRepositories - Repository aggregator implementation for the Spaces domain
 *
 * This class serves as the main repository access point, aggregating all
 * individual repositories. It handles the instantiation of repositories
 * using the shared DataSource and provides them through getter methods.
 */
export class SpacesRepositories implements ISpacesRepositories {
  private readonly spaceRepository: ISpaceRepository;
  private readonly userSpaceMembershipRepository: IUserSpaceMembershipRepository;

  constructor(private readonly dataSource: DataSource) {
    this.spaceRepository = new SpaceRepository(
      this.dataSource.getRepository(SpaceSchema),
    );
    this.userSpaceMembershipRepository = new UserSpaceMembershipRepository(
      this.dataSource.getRepository(UserSpaceMembershipSchema),
    );
  }

  getSpaceRepository(): ISpaceRepository {
    return this.spaceRepository;
  }

  getUserSpaceMembershipRepository(): IUserSpaceMembershipRepository {
    return this.userSpaceMembershipRepository;
  }
}
