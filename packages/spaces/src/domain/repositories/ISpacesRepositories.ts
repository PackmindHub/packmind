import { ISpaceRepository } from './ISpaceRepository';
import { IUserSpaceMembershipRepository } from './IUserSpaceMembershipRepository';

export interface ISpacesRepositories {
  getSpaceRepository(): ISpaceRepository;

  getUserSpaceMembershipRepository(): IUserSpaceMembershipRepository;
}
