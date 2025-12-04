import { PackmindCommand, IUseCase } from '../../UseCase';
import { GitProvider } from '../GitProvider';
import { OrganizationId } from '../../accounts/Organization';

export type GitProviderWithoutToken = {
  hasToken: boolean;
} & Omit<GitProvider, 'token'>;

export type ListProvidersCommand = PackmindCommand & {
  organizationId: OrganizationId;
};

export type ListProvidersResponse = {
  providers: GitProviderWithoutToken[];
};

export type IListProvidersUseCase = IUseCase<
  ListProvidersCommand,
  ListProvidersResponse
>;
