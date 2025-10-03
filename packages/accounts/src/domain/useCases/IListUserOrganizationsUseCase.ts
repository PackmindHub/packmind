import { Organization } from '../entities/Organization';
import { UserId } from '../entities/User';
import { IPublicUseCase } from '@packmind/shared';

export type ListUserOrganizationsCommand = {
  userId: UserId;
};

export type ListUserOrganizationsResponse = {
  organizations: Organization[];
};

export type IListUserOrganizationsUseCase = IPublicUseCase<
  ListUserOrganizationsCommand,
  ListUserOrganizationsResponse
>;
