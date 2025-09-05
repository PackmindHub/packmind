import { User } from '../entities/User';
import { IPublicUseCase, PublicEmptyPackmindCommand } from '@packmind/shared';

export type ListUsersCommand = PublicEmptyPackmindCommand;

export type ListUsersResponse = {
  users: User[];
};

export type IListUsersUseCase = IPublicUseCase<
  ListUsersCommand,
  ListUsersResponse
>;
