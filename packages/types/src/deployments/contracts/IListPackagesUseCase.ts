import { IUseCase, PackmindCommand } from '../../UseCase';
import { OrganizationId } from '../../accounts/Organization';
import { Package } from '../Package';

export type ListPackagesCommand = PackmindCommand & {
  organizationId: OrganizationId;
};

export type ListPackagesResponse = {
  packages: Package[];
};

export type IListPackagesUseCase = IUseCase<
  ListPackagesCommand,
  ListPackagesResponse
>;
