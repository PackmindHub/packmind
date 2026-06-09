import { PackmindCommand, IUseCase } from '../../UseCase';
import { GitProvider } from '../GitProvider';
import { OrganizationId } from '../../accounts/Organization';

export type GitProviderWithoutToken = {
  hasAuth: boolean;
  authMethod: 'token' | 'app';
} & Omit<GitProvider, 'token'>;

/**
 * Presentation DTO for the Git connections list view. Enriches the
 * tokenless provider with `lastDistributionAt` — the ISO timestamp of the
 * most recent successful distribution that targeted any repo under this
 * provider, or null if none. The git domain's ListProvidersUseCase
 * returns this with `lastDistributionAt: null`; the API service enriches
 * it by calling the deployments port before responding.
 */
export type GitProviderListItem = GitProviderWithoutToken & {
  lastDistributionAt: string | null;
};

export type ListProvidersCommand = PackmindCommand & {
  organizationId: OrganizationId;
};

export type ListProvidersResponse = {
  providers: GitProviderListItem[];
};

export type IListProvidersUseCase = IUseCase<
  ListProvidersCommand,
  ListProvidersResponse
>;
