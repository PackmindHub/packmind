import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import type { MockedFunction } from 'vitest';
import { SyncSurface } from './SyncSurface';
import { useDeployPackagesMutation } from '../../../api/queries/DeploymentsQueries';
import { STUB_PACKAGES, STUB_PROVIDER_OK } from '../stubPackages';

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
});
