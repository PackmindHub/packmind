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
  UnlinkMarketplaceButton,
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

describe('MarketplaceRow', () => {
  it('produces the table cell map for a marketplace', () => {
    const cells = MarketplaceRow({
      marketplace: baseMarketplace,
      onUnlink: jest.fn(),
      isUnlinking: false,
    });

    expect(cells.id).toBe('mkt-1');
    expect(cells.name).toBeDefined();
    expect(cells.repository).toBeDefined();
    expect(cells.state).toBeDefined();
    expect(cells.actions).toBeDefined();
  });

  it('renders the marketplace name as a link to the details route when orgSlug is set', () => {
    const cells = MarketplaceRow({
      marketplace: baseMarketplace,
      onUnlink: jest.fn(),
      isUnlinking: false,
      orgSlug: 'acme',
    });

    render(
      <UIProvider>
        <MemoryRouter>{cells.name as React.ReactElement}</MemoryRouter>
      </UIProvider>,
    );

    const link = screen.getByRole('link', { name: /Acme Playbook/ });
    expect(link).toHaveAttribute('href', '/org/acme/marketplaces/mkt-1');
  });
});

describe('MarketplaceRow repository cell', () => {
  const renderRepositoryCell = (marketplace: MarketplaceListItem) => {
    const cells = MarketplaceRow({
      marketplace,
      onUnlink: jest.fn(),
      isUnlinking: false,
    });
    render(<UIProvider>{cells.repository}</UIProvider>);
  };

  it('renders an external link to the repository web URL', () => {
    renderRepositoryCell(baseMarketplace);

    const link = screen.getByRole('link', {
      name: 'Open acme/plugins on GitHub',
    });
    expect(link).toHaveAttribute('href', 'https://github.com/acme/plugins');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders the owner/repo as plain text when there is no URL', () => {
    renderRepositoryCell({
      ...baseMarketplace,
      repository: {
        gitProviderId: createGitProviderId('provider-1'),
        owner: 'acme',
        repo: 'plugins',
        branch: 'main',
        providerSource: 'unknown',
        url: '',
      },
    });

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('acme/plugins')).toBeInTheDocument();
  });

  it('renders a dash when the backing repository is missing', () => {
    renderRepositoryCell({ ...baseMarketplace, repository: null });

    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('UnlinkMarketplaceButton', () => {
  const renderButton = (overrides: { isUnlinking?: boolean } = {}) => {
    const onUnlink = jest.fn();
    render(
      <UIProvider>
        <UnlinkMarketplaceButton
          marketplace={baseMarketplace}
          onUnlink={onUnlink}
          isUnlinking={overrides.isUnlinking ?? false}
        />
      </UIProvider>,
    );
    return { onUnlink };
  };

  it('exposes an accessible unlink button labelled with the marketplace name', () => {
    renderButton();
    expect(
      screen.getByRole('button', { name: 'Unlink Acme Playbook' }),
    ).toBeInTheDocument();
  });

  it('invokes onUnlink when the user confirms the dialog', async () => {
    const { onUnlink } = renderButton();

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Unlink Acme Playbook' }),
      );
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

describe('formatLastValidated', () => {
  const { formatLastValidated } = __testables__;

  it('returns "Pending" when there is no last-validated timestamp', () => {
    expect(formatLastValidated(null)).toBe('Pending');
  });

  it('returns "Just now" within the first minute', () => {
    expect(formatLastValidated(new Date(Date.now() - 5_000))).toBe('Just now');
  });

  it('returns minutes for short intervals', () => {
    expect(formatLastValidated(new Date(Date.now() - 5 * 60_000))).toBe(
      '5m ago',
    );
  });

  it('returns hours for medium intervals', () => {
    expect(formatLastValidated(new Date(Date.now() - 3 * 60 * 60_000))).toBe(
      '3h ago',
    );
  });

  it('returns days for long intervals under a month', () => {
    expect(
      formatLastValidated(new Date(Date.now() - 5 * 24 * 60 * 60_000)),
    ).toBe('5d ago');
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

  it('falls back to "Unknown provider" for unrecognized sources', () => {
    expect(providerLabel('unknown')).toBe('Unknown provider');
  });
});
