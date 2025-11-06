import { PackmindCommand, IUseCase } from '../../UseCase';
import { GitProvider } from '../GitProvider';
import { OrganizationId } from '../../accounts/Organization';

export type ListProvidersCommand = PackmindCommand & {
  organizationId: OrganizationId;
};

export type IListProvidersUseCase = IUseCase<
  ListProvidersCommand,
  GitProvider[]
>;
