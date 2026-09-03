import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import type { MockedFunction } from 'vitest';
import { createMarketplaceId } from '@packmind/types';
import { SyncSurface } from './SyncSurface';
import type { MarketplaceSyncTarget } from './SyncSurface';
import { useDeployPackagesMutation } from '../../../api/queries/DeploymentsQueries';
import { STUB_PACKAGES, STUB_PROVIDER_OK } from '../stubPackages';
import type { MarketplaceDrift } from '../types';

vi.mock('../../../api/queries/DeploymentsQueries', () => ({
  useDeployPackagesMutation: vi.fn(),
}));

const mockedUseDeployPackagesMutation =
  useDeployPackagesMutation as MockedFunction<typeof useDeployPackagesMutation>;

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <UIProvider>
        <QueryClientProvider client={queryClient}>
          {component}
        </QueryClientProvider>
      </UIProvider>
    </MemoryRouter>,
  );
};

/**
 * The first stub package carries a drifted install on the provider that has a
 * token, so the review step opens with something selected and the confirm
 * button enabled. Anything CLI-locked or mid-distribution would leave the
 * button disabled and never reach the receipt.
 */
const scope = { kind: 'package' as const, packageId: STUB_PACKAGES[0].id };

const CATALOG: MarketplaceDrift = {
  id: createMarketplaceId('mkt-1'),
  name: 'Acme catalog',
  plugins: [
    {
      pluginSlug: 'acme-backend',
      packageId: STUB_PACKAGES[0].id,
      packageName: 'Backend guidelines',
    },
    {
      pluginSlug: 'acme-frontend',
      packageId: STUB_PACKAGES[1].id,
      packageName: 'Frontend guidelines',
    },
  ],
  publishedPackageNames: ['Backend guidelines', 'Frontend guidelines'],
};

const CATALOG_PICK: MarketplaceSyncTarget = {
  marketplace: CATALOG,
  plugins: CATALOG.plugins,
};

/** A batch of one repository package and one catalog. */
const mixedScope = {
  kind: 'bulk' as const,
  packageIds: [STUB_PACKAGES[0].id],
  marketplaces: [CATALOG_PICK],
};

/** A batch of catalogs alone: no package id, so no repository side. */
const catalogOnlyScope = {
  kind: 'bulk' as const,
  packageIds: [],
  marketplaces: [CATALOG_PICK],
};

function renderSurface(
  props: Partial<React.ComponentProps<typeof SyncSurface>> = {},
) {
  return renderWithProviders(
    <SyncSurface
      packages={STUB_PACKAGES}
      scope={scope}
      providersWithToken={new Set([STUB_PROVIDER_OK])}
      isProvidersLoading={false}
      onCancel={vi.fn()}
      onConfirm={vi.fn()}
      {...props}
    />,
  );
}

const distributeMarketplaces = (accepted: number, failed = 0) =>
  vi.fn().mockResolvedValue({ accepted, failed });

/** Drives the review step through to the receipt. */
async function distribute() {
  const user = userEvent.setup();
  const confirm = await screen.findByRole('button', {
    name: /^Distribute/,
  });
  expect(confirm).toBeEnabled();
  await user.click(confirm);
}

describe('SyncSurface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseDeployPackagesMutation.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
    } as unknown as ReturnType<typeof useDeployPackagesMutation>);
  });

  describe('when the distribution has succeeded', () => {
    it('ends with a control that names what it does', async () => {
      renderWithProviders(
        <SyncSurface
          packages={STUB_PACKAGES}
          scope={scope}
          providersWithToken={new Set([STUB_PROVIDER_OK])}
          isProvidersLoading={false}
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
        />,
      );

      await distribute();

      expect(
        await screen.findByRole('button', { name: 'Done' }),
      ).toBeInTheDocument();
      /*
       * The label this replaces. The surface is reached from a package tab and
       * from the space-level Distribution screen, and neither is an overview.
       */
      expect(
        screen.queryByRole('button', { name: 'Back to overview' }),
      ).not.toBeInTheDocument();
    });

    it('dismisses the receipt through that control', async () => {
      const onCancel = vi.fn();
      renderWithProviders(
        <SyncSurface
          packages={STUB_PACKAGES}
          scope={scope}
          providersWithToken={new Set([STUB_PROVIDER_OK])}
          isProvidersLoading={false}
          onCancel={onCancel}
          onConfirm={vi.fn()}
        />,
      );

      await distribute();
      await userEvent.click(
        await screen.findByRole('button', { name: 'Done' }),
      );

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('when an Auto-update destination is given', () => {
    it('offers it on the receipt', async () => {
      renderWithProviders(
        <SyncSurface
          packages={STUB_PACKAGES}
          scope={scope}
          providersWithToken={new Set([STUB_PROVIDER_OK])}
          isProvidersLoading={false}
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
          autoUpdateHref="/org/acme/setup/auto-update"
        />,
      );

      await distribute();

      expect(
        await screen.findByRole('link', { name: 'Set up Auto-update' }),
      ).toHaveAttribute('href', '/org/acme/setup/auto-update');
      expect(screen.getByText(/on a schedule/)).toBeInTheDocument();
    });
  });

  describe('when no Auto-update destination is given', () => {
    /*
     * The three callers that pass nothing, which is every one of them but the
     * space-level Distribution screen. The receipt they already had must not
     * grow a link they never asked for.
     */
    it('makes no offer', async () => {
      renderWithProviders(
        <SyncSurface
          packages={STUB_PACKAGES}
          scope={scope}
          providersWithToken={new Set([STUB_PROVIDER_OK])}
          isProvidersLoading={false}
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
        />,
      );

      await distribute();
      await screen.findByRole('button', { name: 'Done' });

      expect(
        screen.queryByRole('link', { name: 'Set up Auto-update' }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/on a schedule/)).not.toBeInTheDocument();
    });
  });

  describe('when the batch carries a marketplace', () => {
    const renderMixed = (
      onDistributeMarketplaces = distributeMarketplaces(2),
    ) => renderSurface({ scope: mixedScope, onDistributeMarketplaces });

    it('names the catalog', () => {
      renderMixed();

      expect(screen.getByText('Acme catalog')).toBeInTheDocument();
    });

    it('lists its plugins', () => {
      renderMixed();

      expect(screen.getByText('acme-backend')).toBeInTheDocument();
    });

    /*
     * The sentence above the list describes a commit on a branch, which is not
     * what happens to a plugin. Left alone it would have spoken for this half
     * too.
     */
    it('says how a marketplace is reached instead', () => {
      renderMixed();

      expect(
        screen.getByText(/opens a pull request on the marketplace repository/),
      ).toBeInTheDocument();
    });

    it('names both halves in the title', () => {
      renderMixed();

      expect(
        screen.getByText('Distribute 1 package and 1 marketplace'),
      ).toBeInTheDocument();
    });

    it('counts both halves on the confirm button', () => {
      renderMixed();

      expect(
        screen.getByRole('button', { name: /and 2 plugins$/ }),
      ).toBeInTheDocument();
    });

    it('hands the picks to the caller on confirm', async () => {
      const onDistributeMarketplaces = distributeMarketplaces(2);
      renderMixed(onDistributeMarketplaces);

      await distribute();

      expect(onDistributeMarketplaces).toHaveBeenCalledWith([CATALOG_PICK]);
    });

    describe('when a plugin is unticked', () => {
      it('leaves it out of the picks', async () => {
        const onDistributeMarketplaces = distributeMarketplaces(1);
        renderMixed(onDistributeMarketplaces);

        await userEvent.click(
          screen.getByRole('checkbox', {
            name: 'Select Frontend guidelines on Acme catalog',
          }),
        );
        await distribute();

        expect(onDistributeMarketplaces).toHaveBeenCalledWith([
          { marketplace: CATALOG, plugins: [CATALOG.plugins[0]] },
        ]);
      });
    });

    describe('the receipt', () => {
      it('says the distribution started rather than finished', async () => {
        renderMixed();

        await distribute();

        expect(
          await screen.findByText('Distribution started'),
        ).toBeInTheDocument();
      });

      it('no longer claims the distributions were updated', async () => {
        renderMixed();

        await distribute();
        await screen.findByRole('button', { name: 'Done' });

        expect(
          screen.queryByText('Distributions updated'),
        ).not.toBeInTheDocument();
      });

      it('says the plugins are still on their way', async () => {
        renderMixed();

        await distribute();

        expect(
          await screen.findByText(/stays drifted until someone merges it/),
        ).toBeInTheDocument();
      });

      it('keeps stating what the repositories received', async () => {
        renderMixed();

        await distribute();

        expect(
          await screen.findByText(/Those distributions are now aligned/),
        ).toBeInTheDocument();
      });
    });

    describe('when the marketplace refuses a plugin', () => {
      it('says so on the receipt', async () => {
        renderMixed(distributeMarketplaces(1, 1));

        await distribute();

        expect(
          await screen.findByText(/1 plugin could not be sent/),
        ).toBeInTheDocument();
      });
    });

    describe('when the repository half fails', () => {
      /*
       * Half a batch out the door is a state the reader would have to
       * reconstruct from two screens, and the button they land back on offers
       * the whole thing again.
       */
      it('does not send the marketplace half', async () => {
        mockedUseDeployPackagesMutation.mockReturnValue({
          mutateAsync: vi.fn().mockRejectedValue(new Error('no token')),
        } as unknown as ReturnType<typeof useDeployPackagesMutation>);
        const onDistributeMarketplaces = distributeMarketplaces(2);
        renderMixed(onDistributeMarketplaces);

        await distribute();
        await screen.findByText('no token');

        expect(onDistributeMarketplaces).not.toHaveBeenCalled();
      });
    });
  });

  describe('when the batch is catalogs alone', () => {
    const renderCatalogsOnly = (
      onDistributeMarketplaces = distributeMarketplaces(2),
    ) => renderSurface({ scope: catalogOnlyScope, onDistributeMarketplaces });

    it('titles itself after them', () => {
      renderCatalogsOnly();

      expect(
        screen.getByText('Distribute to 1 marketplace'),
      ).toBeInTheDocument();
    });

    it('offers the confirm button all the same', () => {
      renderCatalogsOnly();

      expect(
        screen.getByRole('button', {
          name: 'Distribute 2 plugins to 1 marketplace',
        }),
      ).toBeEnabled();
    });

    /* The count belongs to the repository half, which is empty here. */
    it('states no readiness count', () => {
      renderCatalogsOnly();

      expect(screen.queryByText(/ready to distribute/)).not.toBeInTheDocument();
    });

    it('makes no Auto-update offer, having made no commit', async () => {
      renderCatalogsOnly();

      await distribute();
      await screen.findByRole('button', { name: 'Done' });

      expect(
        screen.queryByRole('link', { name: 'Set up Auto-update' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the caller offers no marketplace mechanism', () => {
    /*
     * OSS compiles this surface with no marketplaces to reach. The lane is the
     * callback, not the data: a scope carrying catalogs with nothing able to
     * send them would draw checkboxes that do nothing.
     */
    it('shows no marketplace section', () => {
      renderSurface({ scope: mixedScope });

      expect(screen.queryByText('Acme catalog')).not.toBeInTheDocument();
    });
  });
});
