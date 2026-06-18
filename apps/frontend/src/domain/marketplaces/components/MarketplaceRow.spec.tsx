import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';
import { UIProvider } from '@packmind/ui';
import {
  createGitProviderId,
  type MarketplaceId,
  type MarketplaceListItem,
} from '@packmind/types';
import {
  MarketplaceRow,
  RowActionsMenu,
  __testables__,
} from './MarketplaceRow';

const baseMarketplace: MarketplaceListItem = {
  id: 'mkt-1' as MarketplaceId,
  organizationId: 'org-1' as MarketplaceListItem['organizationId'],
  gitRepoId: 'repo-1' as MarketplaceListItem['gitRepoId'],
  name: 'Acme Playbook',
  vendor: 'anthropic',
  addedBy: 'user-1' as MarketplaceListItem['addedBy'],
  linkedAt: new Date('2026-04-01T10:00:00.000Z'),
  state: 'healthy',
  lastValidatedAt: new Date(Date.now() - 30 * 60 * 1000),
  descriptor: {
    vendor: 'anthropic',
    name: 'Acme Playbook',
    plugins: [],
    raw: {},
  },
  pluginCount: 7,
  createdAt: new Date('2026-04-01T10:00:00.000Z'),
  updatedAt: new Date('2026-04-01T10:00:00.000Z'),
  deletedAt: null,
  addedByUserName: 'Jane Admin',
  repository: {
    gitProviderId: createGitProviderId('provider-1'),
    owner: 'acme',
    repo: 'plugins',
    branch: 'main',
    providerSource: 'github',
    url: 'https://github.com/acme/plugins',
  },
};

const renderRow = (
  overrides: Partial<MarketplaceListItem> = {},
  rowProps: {
    orgSlug?: string;
    isUnlinking?: boolean;
    isRefreshing?: boolean;
  } = {},
) => {
  const onUnlink = jest.fn();
  render(
    <UIProvider>
      <MemoryRouter>
        <MarketplaceRow
          marketplace={{ ...baseMarketplace, ...overrides }}
          onUnlink={onUnlink}
          isUnlinking={rowProps.isUnlinking ?? false}
          isRefreshing={rowProps.isRefreshing ?? false}
          orgSlug={rowProps.orgSlug}
        />
      </MemoryRouter>
    </UIProvider>,
  );
  return { onUnlink };
};

describe('MarketplaceRow', () => {
  it('renders the marketplace name as a link to the details route when orgSlug is set', () => {
    renderRow({}, { orgSlug: 'acme' });

    const link = screen.getByRole('link', { name: /Acme Playbook/ });
    expect(link).toHaveAttribute('href', '/org/acme/marketplaces/mkt-1');
  });

  it('shows the plugin count with the correct plural', () => {
    renderRow();
    expect(screen.getByText('7 plugins')).toBeInTheDocument();
  });

  it('uses the singular noun when the marketplace has one plugin', () => {
    renderRow({ pluginCount: 1 });
    expect(screen.getByText('1 plugin')).toBeInTheDocument();
  });

  it('renders the refreshing spinner when the row is being refreshed', () => {
    renderRow({}, { isRefreshing: true });
    expect(screen.getByLabelText('Checking marketplace')).toBeInTheDocument();
  });

  it('does not render the state dot when the marketplace is healthy and up to date', () => {
    renderRow();
    expect(
      screen.queryByTestId('marketplace-state-dot-healthy'),
    ).not.toBeInTheDocument();
  });

  it('renders the orange state dot when the marketplace is unreachable', () => {
    renderRow({ state: 'unreachable' });
    expect(
      screen.getByTestId('marketplace-state-dot-unreachable'),
    ).toBeInTheDocument();
  });

  it('does not render the state dot when the marketplace is drifting', () => {
    renderRow({ state: 'drift' });
    expect(
      screen.queryByTestId('marketplace-state-dot-drift'),
    ).not.toBeInTheDocument();
  });

  it('renders the outdated indicator with the drifted plugin count when the marketplace is drifting', () => {
    renderRow({
      state: 'drift',
      descriptor: {
        vendor: 'anthropic',
        name: 'Acme Playbook',
        plugins: [],
        raw: {},
        driftedPluginSlugs: ['plugin-a', 'plugin-b'],
      },
    });
    expect(screen.getByText('2 outdated')).toBeInTheDocument();
  });

  it('renders the outdated indicator with the upstream plugin count when plugins are outdated', () => {
    renderRow({ outdatedPluginSlugs: ['plugin-a', 'plugin-b', 'plugin-c'] });
    expect(screen.getByText('3 outdated')).toBeInTheDocument();
  });

  it('does not render the outdated indicator for a healthy marketplace', () => {
    renderRow();
    expect(screen.queryByText(/outdated/i)).not.toBeInTheDocument();
  });

  it('renders the repo actions trigger labelled with the owner/repo', () => {
    renderRow();
    expect(
      screen.getByRole('button', {
        name: 'Repository actions for acme/plugins',
      }),
    ).toBeInTheDocument();
  });

  it('renders a dash for the repository when the backing repository is missing', () => {
    renderRow({ repository: null });
    expect(
      screen.queryByRole('button', { name: /Repository actions/ }),
    ).not.toBeInTheDocument();
    // The repository cell and the coverage placeholder both render an em-dash.
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });
});

describe('RowActionsMenu', () => {
  const renderMenu = (overrides: { isUnlinking?: boolean } = {}) => {
    const onUnlink = jest.fn();
    render(
      <UIProvider>
        <RowActionsMenu
          marketplace={baseMarketplace}
          onUnlink={onUnlink}
          isUnlinking={overrides.isUnlinking ?? false}
        />
      </UIProvider>,
    );
    return { onUnlink };
  };

  it('exposes an accessible trigger labelled with the marketplace name', () => {
    renderMenu();
    expect(
      screen.getByRole('button', { name: 'Actions for Acme Playbook' }),
    ).toBeInTheDocument();
  });

  it('invokes onUnlink when the user confirms the dialog from the menu', async () => {
    const { onUnlink } = renderMenu();

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Actions for Acme Playbook' }),
      );
    });

    const unlinkItem = await screen.findByText('Unlink marketplace');
    await act(async () => {
      fireEvent.click(unlinkItem);
    });

    const confirmButton = await screen.findByRole('button', {
      name: 'Unlink',
    });
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    expect(onUnlink).toHaveBeenCalledWith('mkt-1');
  });
});

describe('vendorLabel', () => {
  const { vendorLabel } = __testables__;

  it('maps anthropic to "Claude Code"', () => {
    expect(vendorLabel('anthropic')).toBe('Claude Code');
  });

  it('returns the raw vendor when unknown', () => {
    expect(vendorLabel('future-vendor')).toBe('future-vendor');
  });
});

describe('providerLabel', () => {
  const { providerLabel } = __testables__;

  it('maps github to "GitHub"', () => {
    expect(providerLabel('github')).toBe('GitHub');
  });

  it('maps gitlab to "GitLab"', () => {
    expect(providerLabel('gitlab')).toBe('GitLab');
  });

  it('falls back to "provider" for unrecognized sources', () => {
    expect(providerLabel('unknown')).toBe('provider');
  });
});

describe('deriveSshUrl', () => {
  const { deriveSshUrl } = __testables__;

  it('derives a GitHub SSH URL from the web URL', () => {
    expect(deriveSshUrl('https://github.com/acme/plugins')).toBe(
      'git@github.com:acme/plugins.git',
    );
  });

  it('strips a trailing .git before re-adding it', () => {
    expect(deriveSshUrl('https://github.com/acme/plugins.git')).toBe(
      'git@github.com:acme/plugins.git',
    );
  });

  it('handles GitLab subgroup paths', () => {
    expect(deriveSshUrl('https://gitlab.com/acme/team/plugins')).toBe(
      'git@gitlab.com:acme/team/plugins.git',
    );
  });

  it('returns null for an empty URL', () => {
    expect(deriveSshUrl('')).toBeNull();
  });

  it('returns null for a non-HTTP URL', () => {
    expect(deriveSshUrl('git@github.com:acme/plugins.git')).toBeNull();
  });
});

describe('normalizeHttps', () => {
  const { normalizeHttps } = __testables__;

  it('appends .git when missing', () => {
    expect(normalizeHttps('https://github.com/acme/plugins')).toBe(
      'https://github.com/acme/plugins.git',
    );
  });

  it('keeps a single trailing .git when already present', () => {
    expect(normalizeHttps('https://github.com/acme/plugins.git')).toBe(
      'https://github.com/acme/plugins.git',
    );
  });

  it('returns the raw URL when it is not HTTP(S)', () => {
    expect(normalizeHttps('git@github.com:acme/plugins.git')).toBe(
      'git@github.com:acme/plugins.git',
    );
  });

  it('returns null for an empty URL', () => {
    expect(normalizeHttps('')).toBeNull();
  });
});
