import { IPublicUseCase } from '../../UseCase';
import { Organization } from '../Organization';

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
