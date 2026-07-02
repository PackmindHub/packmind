import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type {
  MarketplaceId,
  OrganizationId,
  PluginInstallationId,
  PluginInstallationListItem,
} from '@packmind/types';
import { PluginAdoptionTab } from './PluginAdoptionTab';

const orgId = 'org-1' as OrganizationId;
const marketplaceId = 'mkt-1' as MarketplaceId;
const pluginSlug = 'my-plugin';

const usePluginInstallsMock = jest.fn();

jest.mock('../api/queries', () => ({
  useMarketplacePluginInstalls: (...args: unknown[]) =>
    usePluginInstallsMock(...args),
}));

function makeInstall(
  overrides: Partial<PluginInstallationListItem> = {},
): PluginInstallationListItem {
  const base: PluginInstallationListItem = {
    id: 'install-1' as PluginInstallationId,
    organizationId: orgId,
    marketplaceId,
    pluginSlug,
    packageId: null,
    installedVersion: '0.1.0',
    scope: 'user',
    userId: null,
    anonymousIdHash: null,
    anonymousEmailMasked: null,
    identityKey: '',
    repoRemoteUrl: null,
    repoKey: '',
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-10T00:00:00Z'),
    deletedAt: null,
    userDisplayName: null,
  };
  return { ...base, ...overrides };
}

function renderTab(
  items: PluginInstallationListItem[],
  {
    slug = pluginSlug,
    publishedVersion = '0.1.0',
    isLoading = false,
  }: {
    slug?: string;
    publishedVersion?: string | null;
    isLoading?: boolean;
  } = {},
) {
  usePluginInstallsMock.mockReturnValue({ data: items, isLoading });

  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <UIProvider>
      <QueryClientProvider client={client}>
        <PluginAdoptionTab
          organizationId={orgId}
          marketplaceId={marketplaceId}
          pluginSlug={slug}
          publishedVersion={publishedVersion}
          active
        />
      </QueryClientProvider>
    </UIProvider>,
  );
}

describe('PluginAdoptionTab', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('defers the install fetch to the active flag', () => {
    renderTab([]);
    expect(usePluginInstallsMock).toHaveBeenCalledWith(
      orgId,
      marketplaceId,
      true,
    );
  });

  describe('when loading', () => {
    it('renders the loading indicator', () => {
      renderTab([], { isLoading: true });
      expect(screen.getByTestId('plugin-adoption-loading')).toBeInTheDocument();
    });
  });

  describe('when there are no installs', () => {
    it('renders the empty-state message', () => {
      renderTab([]);
      expect(screen.getByTestId('plugin-adoption-empty')).toBeInTheDocument();
    });
  });

  describe('by repo axis', () => {
    it('lists repo-bound installs by repoKey', () => {
      renderTab([
        makeInstall({
          id: 'i1' as PluginInstallationId,
          scope: 'project',
          repoKey: 'acme/frontend',
          identityKey: 'user-marc',
          userId: 'user-marc' as PluginInstallationListItem['userId'],
          userDisplayName: 'Marc Lee',
        }),
      ]);
      expect(screen.getByText('acme/frontend')).toBeInTheDocument();
    });

    it('renders the installed version badge', () => {
      renderTab([
        makeInstall({
          scope: 'project',
          repoKey: 'acme/frontend',
          installedVersion: '0.1.0',
          identityKey: 'user-marc',
          userId: 'user-marc' as PluginInstallationListItem['userId'],
        }),
      ]);
      expect(screen.getByText('0.1.0')).toBeInTheDocument();
    });

    it('shows a behind-arrow when the installed version trails the published one', () => {
      renderTab(
        [
          makeInstall({
            scope: 'project',
            repoKey: 'acme/frontend',
            installedVersion: '0.1.0',
            identityKey: 'user-marc',
            userId: 'user-marc' as PluginInstallationListItem['userId'],
          }),
        ],
        { publishedVersion: '0.2.0' },
      );
      expect(screen.getByText('0.1.0')).toBeInTheDocument();
      expect(screen.getByText('0.2.0')).toBeInTheDocument();
    });

    it('renders "Unidentified repository" for repo-bound installs with empty repoKey', () => {
      renderTab([
        makeInstall({
          scope: 'project',
          repoKey: '',
          identityKey: 'user-bob',
          userId: 'user-bob' as PluginInstallationListItem['userId'],
        }),
      ]);
      expect(screen.getByText('Unidentified repository')).toBeInTheDocument();
    });

    it('prompts switching axes when only user-scope installs exist', () => {
      renderTab([
        makeInstall({
          scope: 'user',
          userDisplayName: 'Bob Smith',
          identityKey: 'user-bob',
          userId: 'user-bob' as PluginInstallationListItem['userId'],
        }),
      ]);
      expect(
        screen.getByText(/No repository installs yet/i),
      ).toBeInTheDocument();
    });
  });

  describe('by person axis', () => {
    it('lists installers by display name after switching axis', () => {
      renderTab([
        makeInstall({
          scope: 'user',
          userDisplayName: 'Bob Smith',
          identityKey: 'user-bob',
          userId: 'user-bob' as PluginInstallationListItem['userId'],
        }),
      ]);

      fireEvent.click(screen.getByText('By person'));

      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });

    it('renders the masked email for anonymous installers', () => {
      renderTab([
        makeInstall({
          scope: 'user',
          anonymousIdHash: 'abc123',
          anonymousEmailMasked: 'b**.s***@acme.com',
          identityKey: 'abc123',
        }),
      ]);

      fireEvent.click(screen.getByText('By person'));

      expect(screen.getByText('b**.s***@acme.com')).toBeInTheDocument();
    });
  });

  describe('unknown installed version', () => {
    it('renders an "unknown" badge when no version was reported', () => {
      renderTab([
        makeInstall({
          scope: 'project',
          repoKey: 'acme/frontend',
          installedVersion: null,
          identityKey: 'user-marc',
          userId: 'user-marc' as PluginInstallationListItem['userId'],
        }),
      ]);
      expect(screen.getByText('unknown')).toBeInTheDocument();
    });
  });

  describe('plugin filtering', () => {
    it('filters installs by pluginSlug so unrelated plugins are not shown', () => {
      renderTab(
        [
          makeInstall({
            scope: 'project',
            repoKey: 'acme/frontend',
            pluginSlug: 'my-plugin',
            identityKey: 'user-bob',
            userId: 'user-bob' as PluginInstallationListItem['userId'],
          }),
          makeInstall({
            id: 'install-other' as PluginInstallationId,
            scope: 'project',
            repoKey: 'acme/other',
            pluginSlug: 'other-plugin',
            identityKey: 'user-alice',
            userId: 'user-alice' as PluginInstallationListItem['userId'],
          }),
        ],
        { slug: 'my-plugin' },
      );

      expect(screen.getByText('acme/frontend')).toBeInTheDocument();
      expect(screen.queryByText('acme/other')).not.toBeInTheDocument();
    });
  });
});
