import { PackmindCommand, IUseCase } from '@packmind/types';
import { GitProvider } from '../GitProvider';
import { OrganizationId } from '@packmind/types';

export type ListProvidersCommand = PackmindCommand & {
  organizationId: OrganizationId;
};

export type IListProvidersUseCase = IUseCase<
  ListProvidersCommand,
  GitProvider[]
>;
