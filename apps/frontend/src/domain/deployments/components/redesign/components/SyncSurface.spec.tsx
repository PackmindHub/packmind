import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import type { MockedFunction } from 'vitest';
import {
  createMarketplaceId,
  MarketplaceDistributionStatus,
} from '@packmind/types';
import { SyncSurface } from './SyncSurface';
import type { MarketplaceSyncTarget } from './SyncSurface';
import { useDeployPackagesMutation } from '../../../api/queries/DeploymentsQueries';
import { STUB_PACKAGES, STUB_PROVIDER_OK } from '../stubPackages';
import type { MarketplaceDrift, PackageDrift } from '../types';

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
      lastStatus: MarketplaceDistributionStatus.success,
      prUrl: null,
    },
    {
      pluginSlug: 'acme-frontend',
      packageId: STUB_PACKAGES[1].id,
      packageName: 'Frontend guidelines',
      lastStatus: MarketplaceDistributionStatus.success,
      prUrl: null,
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

  describe('when a destination is pinned to an older release', () => {
    /*
     * No late component anywhere on it — every one is exactly what its release
     * pinned — and a distribution moves it to the newest release all the same.
     * Selecting what to send by the late-component count made this screen read
     * "Nothing to distribute" over a repository several releases behind.
     */
    const pinnedBehind: PackageDrift = {
      ...STUB_PACKAGES[0],
      latestReleaseVersion: '0.3.0',
      hasUnreleasedChanges: false,
      artifacts: STUB_PACKAGES[0].artifacts.map((artifact) => ({
        ...artifact,
        installs: artifact.installs.map((install) => ({
          ...install,
          driftReason: 'aligned' as const,
        })),
      })),
      installLocations: STUB_PACKAGES[0].installLocations.map((location) => ({
        ...location,
        versionSpec: '0.1.0',
      })),
    };

    const pinnedScope = {
      kind: 'bulk' as const,
      packageIds: [pinnedBehind.id],
    };

    it('offers the distribution rather than reading as nothing to do', async () => {
      renderSurface({ packages: [pinnedBehind], scope: pinnedScope });

      expect(
        await screen.findByRole('button', { name: /^Distribute/ }),
      ).toBeInTheDocument();
    });

    it('does not say there is nothing to distribute', () => {
      renderSurface({ packages: [pinnedBehind], scope: pinnedScope });

      expect(
        screen.queryByText('Nothing to distribute.'),
      ).not.toBeInTheDocument();
    });
  });

  describe('what the review says the distribution will do', () => {
    const pinnedAt = (versionSpec: string | null): PackageDrift => ({
      ...STUB_PACKAGES[0],
      latestReleaseVersion: '0.3.0',
      hasUnreleasedChanges: false,
      artifacts: STUB_PACKAGES[0].artifacts.map((artifact) => ({
        ...artifact,
        installs: artifact.installs.map((install) => ({
          ...install,
          driftReason: versionSpec === null ? install.driftReason : 'aligned',
        })),
      })),
      installLocations: STUB_PACKAGES[0].installLocations.map((location) => ({
        ...location,
        versionSpec,
      })),
    });

    const review = (pkg: PackageDrift) =>
      renderSurface({
        packages: [pkg],
        scope: { kind: 'bulk' as const, packageIds: [pkg.id] },
      });

    describe('for a destination pinned to an older release', () => {
      it('names the release it is leaving and the one it arrives on', () => {
        review(pinnedAt('0.1.0'));

        expect(screen.getAllByText('0.1.0 → 0.3.0').length).toBeGreaterThan(0);
      });

      it('no longer counts components, which a pinned landing has none of', () => {
        review(pinnedAt('0.1.0'));

        expect(screen.queryByText(/0 components to update/)).toBeNull();
      });
    });

    /*
     * Two packages, because the line that names where a package is headed sits
     * on the block header, and a batch of one takes that header off: its name
     * is already the title of the screen.
     */
    describe('for a destination tracking the live package', () => {
      it('names the live package rather than a version it is moving to', () => {
        const tracksLive = pinnedAt(null);
        renderSurface({
          packages: [tracksLive, STUB_PACKAGES[1]],
          scope: {
            kind: 'bulk' as const,
            packageIds: [tracksLive.id, STUB_PACKAGES[1].id],
          },
        });

        expect(screen.getAllByText(/live version/).length).toBeGreaterThan(0);
      });
    });

    describe('for a batch leaving several releases behind', () => {
      it('lists them by version rather than as strings', () => {
        const base = pinnedAt('0.9.0');
        const twoPins: PackageDrift = {
          ...base,
          /* Newer than both pins, so both landings have somewhere to go. */
          latestReleaseVersion: '0.11.0',
          installLocations: base.installLocations.map((location, index) => ({
            ...location,
            versionSpec: index === 0 ? '0.10.0' : '0.9.0',
          })),
        };

        renderSurface({
          packages: [twoPins, STUB_PACKAGES[1]],
          scope: {
            kind: 'bulk' as const,
            packageIds: [twoPins.id, STUB_PACKAGES[1].id],
          },
        });

        /* Lexically `0.10.0` sorts first, which is not an order of releases. */
        expect(
          screen.getAllByText(/0\.9\.0, 0\.10\.0 → 0\.11\.0/).length,
        ).toBeGreaterThan(0);
      });
    });

    describe('for a batch mixing a pinned destination with a live one', () => {
      it('names both moves, so neither half of the batch is hidden', () => {
        const base = pinnedAt('0.1.0');
        /* One landing pinned, the rest left tracking the live package. */
        const pinned: PackageDrift = {
          ...base,
          installLocations: base.installLocations.map((location, index) => ({
            ...location,
            versionSpec: index === 0 ? '0.1.0' : null,
          })),
          artifacts: base.artifacts.map((artifact) => ({
            ...artifact,
            installs: artifact.installs.map((install) => ({
              ...install,
              // The live-tracking landings need something late to be sent.
              driftReason:
                install.target.id === base.installLocations[0]?.target.id
                  ? ('aligned' as const)
                  : ('behind' as const),
            })),
          })),
        };

        renderSurface({
          packages: [pinned, STUB_PACKAGES[1]],
          scope: {
            kind: 'bulk' as const,
            packageIds: [pinned.id, STUB_PACKAGES[1].id],
          },
        });

        expect(
          screen.getAllByText(/0\.1\.0 → 0\.3\.0 · live version/).length,
        ).toBeGreaterThan(0);
      });
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

  describe('the box on an install row', () => {
    /*
     * Clicked where a reader clicks, which is the box rather than the input
     * behind it. The row toggles as a whole, so a click that reached the row
     * through the label undid the tick the label had just made, and the one
     * spot on the row that did nothing was the checkbox.
     */
    it('unticks the row', async () => {
      renderSurface();
      const box = screen.getAllByRole('checkbox', {
        name: /^Select acme\//,
      })[0];
      expect(box).toBeChecked();

      await userEvent.click(
        box.closest('label')?.querySelector('[data-part="control"]') as Element,
      );

      expect(box).not.toBeChecked();
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

      it('no longer claims the destinations were updated', async () => {
        renderMixed();

        await distribute();
        await screen.findByRole('button', { name: 'Done' });

        expect(
          screen.queryByText('Destinations updated'),
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
          await screen.findByText(/Those destinations are now aligned/),
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
  describe('when the batch holds a single package', () => {
    /*
     * The reader arrived from that package and its name is on the screen
     * already. A grouping row for it would only fold away the destinations they
     * came to check before confirming a commit.
     */
    it('lists its destinations straight away', () => {
      renderSurface();

      expect(screen.getByText('acme/webapp')).toBeInTheDocument();
    });

    it('draws no row that repeats the package name', () => {
      renderSurface();

      expect(
        screen.queryByRole('button', {
          name: `Expand ${STUB_PACKAGES[0].name}`,
        }),
      ).not.toBeInTheDocument();
    });

    it('names it in the title rather than counting it', () => {
      renderSurface({
        scope: { kind: 'bulk', packageIds: [STUB_PACKAGES[0].id] },
      });

      expect(
        screen.getByText(`Distribute ${STUB_PACKAGES[0].name}`),
      ).toBeInTheDocument();
    });

    it('leaves the package count off the confirm button', () => {
      renderSurface();

      expect(
        screen.getByRole('button', {
          name: /^Distribute to \d+ destinations?$/,
        }),
      ).toBeInTheDocument();
    });
  });

  describe('the selection control on the summary line', () => {
    it('drops every destination at once', async () => {
      const user = userEvent.setup();
      renderSurface();

      await user.click(screen.getByRole('button', { name: 'Unselect all' }));

      expect(
        screen.getByRole('button', {
          name: 'Select at least one destination',
        }),
      ).toBeDisabled();
    });

    it('takes them all back', async () => {
      const user = userEvent.setup();
      renderSurface();

      await user.click(screen.getByRole('button', { name: 'Unselect all' }));
      await user.click(screen.getByRole('button', { name: 'Select all' }));

      expect(
        await screen.findByRole('button', { name: /^Distribute to/ }),
      ).toBeEnabled();
    });
  });
  describe('when the batch groups several packages', () => {
    const twoPackages = {
      kind: 'bulk' as const,
      packageIds: [STUB_PACKAGES[0].id, STUB_PACKAGES[1].id],
    };

    it('keeps the grouping row that tells them apart', () => {
      renderSurface({ scope: twoPackages });

      expect(
        screen.getByRole('checkbox', {
          name: `Select all repositories for ${STUB_PACKAGES[0].name}`,
        }),
      ).toBeInTheDocument();
    });

    /*
     * The fold is for the batch that spans a space. A handful of rows under it
     * only costs a click on what a commit is about to touch.
     */
    it('opens each of them on its destinations while the batch stays small', () => {
      renderSurface({ scope: twoPackages });

      expect(
        screen.getByRole('button', {
          name: `Collapse ${STUB_PACKAGES[0].name}`,
        }),
      ).toBeInTheDocument();
    });

    /*
     * What a push would actually do to one repository, which the move line only
     * summarises. The line is the control that opens it: the row itself toggles
     * the tick, so a click landing on the text used to select the destination
     * instead of opening it, and the list was unreachable.
     */
    describe('the change list behind a move line', () => {
      /** A batch whose single destination arrives unticked. */
      const unticked = {
        kind: 'package' as const,
        packageId: STUB_PACKAGES[0].id,
        installKeys: [],
      };

      const open = async (pkg: PackageDrift) => {
        const user = userEvent.setup();
        await user.click(
          screen.getByRole('button', { name: /^Show what .* changes on / }),
        );
        return pkg;
      };

      describe('when the destination is not selected', () => {
        beforeEach(async () => {
          renderSurface({ scope: unticked });
          await open(STUB_PACKAGES[0]);
        });

        it('opens the list all the same', () => {
          expect(screen.getByText('Updated · 2')).toBeInTheDocument();
        });

        it('leaves the destination unticked', () => {
          expect(
            screen.getByRole('checkbox', { name: /Select acme\/webapp/ }),
          ).not.toBeChecked();
        });
      });

      describe('when a component is late at the destination', () => {
        beforeEach(async () => {
          renderSurface({ scope: unticked });
          await open(STUB_PACKAGES[0]);
        });

        it('groups it under Updated', () => {
          expect(screen.getByText('Updated · 2')).toBeInTheDocument();
        });

        it('names it', () => {
          expect(screen.getByText('Naming conventions')).toBeInTheDocument();
        });

        /*
         * The icon alone asks the reader to have learnt three glyphs. The two
         * rows of this group are a standard and a command, so a list drawing
         * only the glyph leaves which is which to be guessed.
         */
        it('says in words that the standard is a standard', () => {
          expect(screen.getByText('Standard')).toBeInTheDocument();
        });

        it('says in words that the command is a command', () => {
          expect(screen.getByText('Command')).toBeInTheDocument();
        });
      });

      describe('when a component of the package never landed there', () => {
        it('groups it under Added', async () => {
          renderSurface({
            packages: [STUB_PACKAGES[2]],
            scope: { kind: 'package' as const, packageId: STUB_PACKAGES[2].id },
          });
          await open(STUB_PACKAGES[2]);

          expect(screen.getByText('Added · 1')).toBeInTheDocument();
        });
      });

      describe('when a component was deleted on Packmind', () => {
        it('groups it under Removed', async () => {
          renderSurface({
            packages: [STUB_PACKAGES[1]],
            scope: { kind: 'package' as const, packageId: STUB_PACKAGES[1].id },
          });
          await open(STUB_PACKAGES[1]);

          expect(screen.getByText('Removed · 1')).toBeInTheDocument();
        });
      });

      describe('when the list is open', () => {
        it('closes again on a second click', async () => {
          renderSurface({ scope: unticked });
          await open(STUB_PACKAGES[0]);
          const user = userEvent.setup();
          await user.click(
            screen.getByRole('button', { name: /^Hide what .* changes on / }),
          );

          expect(screen.queryByText('Updated · 2')).toBeNull();
        });
      });
    });
  });
});
