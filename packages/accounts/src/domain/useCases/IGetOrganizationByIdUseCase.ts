import { IPublicUseCase } from '@packmind/shared';
import { Organization, OrganizationId } from '../entities/Organization';

export type GetOrganizationByIdCommand = {
  organizationId: OrganizationId;
};

export type GetOrganizationByIdResponse = {
  organization: Organization | null;
};

export type IGetOrganizationByIdUseCase = IPublicUseCase<
  GetOrganizationByIdCommand,
  GetOrganizationByIdResponse
>;
