import {
  IUseCase,
  OrganizationId,
  SanitizedUser,
  UserId,
} from '@packmind/shared';

export type ListUsersCommand = {
  userId: UserId;
  organizationId: OrganizationId;
};

export type ListUsersResponse = {
  users: SanitizedUser[];
};

export type IListUsersUseCase = IUseCase<ListUsersCommand, ListUsersResponse>;
