import { IPublicUseCase } from '@packmind/shared';
import { Organization } from '../entities/Organization';

export type CreateOrganizationCommand = {
  name: string;
};

export type CreateOrganizationResponse = {
  organization: Organization;
};

export type ICreateOrganizationUseCase = IPublicUseCase<
  CreateOrganizationCommand,
  CreateOrganizationResponse
>;
