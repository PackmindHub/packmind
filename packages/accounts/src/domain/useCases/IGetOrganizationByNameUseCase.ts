import { IPublicUseCase } from '@packmind/shared';
import { Organization } from '../entities/Organization';

export type GetOrganizationByNameCommand = {
  name: string;
};

export type GetOrganizationByNameResponse = {
  organization: Organization | null;
};

export type IGetOrganizationByNameUseCase = IPublicUseCase<
  GetOrganizationByNameCommand,
  GetOrganizationByNameResponse
>;
