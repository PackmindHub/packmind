import { IPublicUseCase } from '../../UseCase';
import { Organization } from '../Organization';

export type GetOrganizationBySlugCommand = {
  slug: string;
};

export type GetOrganizationBySlugResponse = {
  organization: Organization | null;
};

export type IGetOrganizationBySlugUseCase = IPublicUseCase<
  GetOrganizationBySlugCommand,
  GetOrganizationBySlugResponse
>;
