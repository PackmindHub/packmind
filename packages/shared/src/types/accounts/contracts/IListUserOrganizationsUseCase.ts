import { Organization } from '../Organization';
import { UserId } from '../User';
import { IPublicUseCase } from '../../UseCase';

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
