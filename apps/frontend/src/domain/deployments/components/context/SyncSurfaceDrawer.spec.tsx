import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { pmToaster, UIProvider } from '@packmind/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import type { Mock } from 'vitest';

import { outcomeToast, SyncSurfaceDrawer } from './SyncSurfaceDrawer';
import { useDeployPackagesMutation } from '../../api/queries/DeploymentsQueries';
import { STUB_PACKAGES, STUB_PROVIDER_OK } from '../redesign/stubPackages';

vi.mock('../../api/queries/DeploymentsQueries', () => ({
  useDeployPackagesMutation: vi.fn(),
}));

function renderDrawer(onClose = vi.fn()) {
  (useDeployPackagesMutation as Mock).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
  });
  render(
    <MemoryRouter>
      <UIProvider>
        <QueryClientProvider client={new QueryClient()}>
          <SyncSurfaceDrawer
            open
            onClose={onClose}
            packages={STUB_PACKAGES}
            scope={{ kind: 'package', packageId: STUB_PACKAGES[0].id }}
            providersWithToken={new Set([STUB_PROVIDER_OK])}
            isProvidersLoading={false}
          />
        </QueryClientProvider>
      </UIProvider>
    </MemoryRouter>,
  );
  return { onClose };
}

const distribute = async () =>
  userEvent.click(await screen.findByRole('button', { name: /^Distribute/ }));

describe('SyncSurfaceDrawer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('once the distribution is sent', () => {
    it('closes itself', async () => {
      const { onClose } = renderDrawer();

      await distribute();

      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });

    it('says so in a toast', async () => {
      const toast = vi.spyOn(pmToaster, 'create');
      renderDrawer();

      await distribute();

      await waitFor(() =>
        expect(toast).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'success' }),
        ),
      );
    });
  });
});

describe('outcomeToast', () => {
  it('counts the destinations updated', () => {
    expect(
      outcomeToast({ installCount: 2, pluginsStarted: 0, pluginsRefused: 0 }),
    ).toEqual({
      type: 'success',
      title: 'Distribution done',
      description: '2 destinations updated.',
    });
  });

  it('reads a batch of plugins alone as started rather than done', () => {
    expect(
      outcomeToast({ installCount: 0, pluginsStarted: 1, pluginsRefused: 0 }),
    ).toEqual({
      type: 'success',
      title: 'Distribution started',
      description: '1 plugin sent for review on the marketplace.',
    });
  });

  it('turns into an error when the marketplace refused a plugin', () => {
    expect(
      outcomeToast({ installCount: 1, pluginsStarted: 0, pluginsRefused: 1 }),
    ).toEqual({
      type: 'error',
      title: 'Distribution partly failed',
      description:
        '1 destination updated. 1 plugin refused by the marketplace.',
    });
  });
});
