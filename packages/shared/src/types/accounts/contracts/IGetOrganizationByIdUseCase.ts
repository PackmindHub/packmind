import { IPublicUseCase } from '../../UseCase';
import { Organization, OrganizationId } from '../Organization';

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
