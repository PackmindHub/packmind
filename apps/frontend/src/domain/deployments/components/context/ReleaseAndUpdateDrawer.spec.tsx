import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import {
  createOrganizationId,
  type PackageReleaseReadiness,
  type PackageResponse,
} from '@packmind/types';
import type { Mock } from 'vitest';

import { ReleaseAndUpdateDrawer } from './ReleaseAndUpdateDrawer';
import {
  useCreatePackageReleaseMutation,
  useDeployPackagesMutation,
} from '../../api/queries/DeploymentsQueries';
import { STUB_PACKAGES, STUB_PROVIDER_OK } from '../redesign/stubPackages';
import type { PackageDrift } from '../redesign/types';

vi.mock('../../api/queries/DeploymentsQueries', () => ({
  useCreatePackageReleaseMutation: vi.fn(),
  useDeployPackagesMutation: vi.fn(),
}));

vi.mock(
  '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider',
  () => ({ useAnalytics: () => ({ track: vi.fn() }) }),
);

/** On its newest release, with work done since: only a cut moves it. */
const onNewestRelease: PackageDrift = {
  ...STUB_PACKAGES[0],
  latestReleaseVersion: '0.3.0',
  hasUnreleasedChanges: true,
  artifacts: STUB_PACKAGES[0].artifacts.map((artifact) => ({
    ...artifact,
    installs: artifact.installs.map((install) => ({
      ...install,
      driftReason: 'aligned' as const,
    })),
  })),
  installLocations: STUB_PACKAGES[0].installLocations.map((location) => ({
    ...location,
    versionSpec: '0.3.0',
  })),
};

const pkg = {
  id: onNewestRelease.id,
  name: onNewestRelease.name,
  spaceId: 'space-1',
  recipes: [],
  standards: [],
  skills: [],
} as unknown as PackageResponse;

const readiness: PackageReleaseReadiness = {
  currentVersion: '0.3.0',
  verdict: 'ready',
  nextVersions: ['0.3.1', '0.4.0', '1.0.0'],
  outdatedComponents: [],
};

function renderDrawer() {
  const calls: string[] = [];
  const createRelease = vi.fn(async () => {
    calls.push('release');
    return {};
  });
  const deploy = vi.fn(async () => {
    calls.push('deploy');
    return {};
  });
  (useCreatePackageReleaseMutation as Mock).mockReturnValue({
    mutateAsync: createRelease,
    isPending: false,
  });
  (useDeployPackagesMutation as Mock).mockReturnValue({ mutateAsync: deploy });

  render(
    <MemoryRouter>
      <UIProvider>
        <QueryClientProvider client={new QueryClient()}>
          <ReleaseAndUpdateDrawer
            pkg={pkg}
            packages={[onNewestRelease]}
            scope={{ kind: 'bulk', packageIds: [onNewestRelease.id] }}
            organizationId={createOrganizationId('org-1')}
            readiness={readiness}
            providersWithToken={new Set([STUB_PROVIDER_OK])}
            isProvidersLoading={false}
            open
            onClose={vi.fn()}
          />
        </QueryClientProvider>
      </UIProvider>
    </MemoryRouter>,
  );

  return { calls, createRelease };
}

const confirm = () =>
  screen.findByRole('button', { name: /^Release 0\.3\.1 and update \d+$/ });

describe('ReleaseAndUpdateDrawer', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows where the release is going before it is cut', async () => {
    renderDrawer();

    expect(
      (await screen.findAllByText('0.3.0 → 0.3.1')).length,
    ).toBeGreaterThan(0);
  });

  it('releases and updates from a single click', async () => {
    const { calls } = renderDrawer();

    await userEvent.click(await confirm());

    expect(calls).toEqual(['release', 'deploy']);
  });

  it('cuts the version typed in the field', async () => {
    const { createRelease } = renderDrawer();

    await userEvent.click(await screen.findByRole('button', { name: '0.4.0' }));
    await userEvent.click(
      await screen.findByRole('button', {
        name: /^Release 0\.4\.0 and update \d+$/,
      }),
    );

    expect(createRelease).toHaveBeenCalledWith(
      expect.objectContaining({ version: '0.4.0' }),
    );
  });
});
