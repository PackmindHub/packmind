import { IPublicUseCase } from '@packmind/shared';
import { Organization } from '../entities/Organization';
import { UserId } from '../entities';

export type CreateOrganizationCommand = {
  userId: UserId;
  name: string;
};

export type CreateOrganizationResponse = {
  organization: Organization;
};

export type ICreateOrganizationUseCase = IPublicUseCase<
  CreateOrganizationCommand,
  CreateOrganizationResponse
>;
