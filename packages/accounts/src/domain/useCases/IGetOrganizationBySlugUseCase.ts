import { IPublicUseCase } from '@packmind/shared';
import { Organization } from '../entities/Organization';

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
