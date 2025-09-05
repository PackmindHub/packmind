import { IPublicUseCase, PublicEmptyPackmindCommand } from '@packmind/shared';
import { Organization } from '../entities/Organization';

export type ListOrganizationsCommand = PublicEmptyPackmindCommand;

export type ListOrganizationsResponse = {
  organizations: Organization[];
};

export type IListOrganizationsUseCase = IPublicUseCase<
  ListOrganizationsCommand,
  ListOrganizationsResponse
>;
