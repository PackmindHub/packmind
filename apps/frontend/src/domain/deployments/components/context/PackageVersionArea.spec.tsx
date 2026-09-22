import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import {
  createOrganizationId,
  createPackageId,
  createSpaceId,
  type PackageReleaseReadiness,
  type PackageReleaseSummary,
} from '@packmind/types';
import type { Mock } from 'vitest';

import { PackageVersionArea } from './PackageVersionArea';
import {
  useListPackageReleasesQuery,
  useGetPackageReleaseQuery,
} from '../../api/queries/DeploymentsQueries';

vi.mock('../../api/queries/DeploymentsQueries', () => ({
  useListPackageReleasesQuery: vi.fn(),
  useCreatePackageReleaseMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useGetPackageReleaseQuery: vi.fn(),
}));

vi.mock(
  '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider',
  () => ({
    useAnalytics: () => ({ track: vi.fn() }),
  }),
);

const packageId = createPackageId('pkg-1');
const spaceId = createSpaceId('space-1');
const organizationId = createOrganizationId('org-1');

/*
 * Annotated rather than inferred: the defaults below would otherwise fix
 * `verdict` to 'ready' and `outdatedComponents` to never[], and every case that
 * passes anything else would stop compiling. Frontend specs are type-checked
 * since #500.
 */
const renderComponent = ({
  readiness = {
    currentVersion: null,
    verdict: 'ready',
    nextVersions: ['0.1.0', '0.2.0', '1.0.0'],
    outdatedComponents: [],
  },
  isLoading = false,
  componentsCount = 1,
  releases = [],
}: {
  readiness?: PackageReleaseReadiness;
  isLoading?: boolean;
  componentsCount?: number;
  releases?: PackageReleaseSummary[];
} = {}) => {
  (useListPackageReleasesQuery as Mock).mockReturnValue({
    data: {
      releases,
      readiness,
    },
    isLoading,
  });

  (useGetPackageReleaseQuery as Mock).mockReturnValue({
    data: undefined,
    isLoading: false,
  });

  render(
    <UIProvider>
      <PackageVersionArea
        packageId={packageId}
        spaceId={spaceId}
        organizationId={organizationId}
        componentsCount={componentsCount}
      />
    </UIProvider>,
  );
};

describe('PackageVersionArea', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('never released — shows "Not released yet" and button is enabled', () => {
    renderComponent({
      readiness: {
        currentVersion: null,
        verdict: 'ready',
        nextVersions: ['0.1.0', '0.2.0', '1.0.0'],
        outdatedComponents: [],
      },
    });

    expect(screen.getByText('Not released yet')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create a release/i }),
    ).toBeEnabled();
  });

  it('never released does not render the sentinel — never shows "0.0.0"', () => {
    renderComponent({
      readiness: {
        currentVersion: null,
        verdict: 'ready',
        nextVersions: ['0.1.0', '0.2.0', '1.0.0'],
        outdatedComponents: [],
      },
    });

    expect(screen.queryByText('0.0.0')).not.toBeInTheDocument();
  });

  it('released — shows the current version in badge', () => {
    renderComponent({
      readiness: {
        currentVersion: '0.1.0',
        verdict: 'ready',
        nextVersions: ['0.2.0', '1.0.0', '2.0.0'],
        outdatedComponents: [],
      },
    });

    expect(screen.getByText('0.1.0')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create a release/i }),
    ).toBeEnabled();
  });

  it('empty package — button is disabled with message', () => {
    renderComponent({
      readiness: {
        currentVersion: null,
        verdict: 'no_components',
        nextVersions: ['0.1.0', '0.2.0', '1.0.0'],
        outdatedComponents: [],
      },
    });

    expect(
      screen.getByRole('button', { name: /create a release/i }),
    ).toBeDisabled();
    expect(screen.getByText('Add at least one component')).toBeInTheDocument();
  });

  it('unchanged since the last release — button is disabled with message', () => {
    renderComponent({
      readiness: {
        currentVersion: '0.1.0',
        verdict: 'no_change',
        nextVersions: ['0.2.0', '1.0.0', '2.0.0'],
        outdatedComponents: [],
      },
    });

    expect(
      screen.getByRole('button', { name: /create a release/i }),
    ).toBeDisabled();
    expect(
      screen.getByText('Nothing has changed since 0.1.0'),
    ).toBeInTheDocument();
  });

  it('empty beats changed — shows empty message, not changed message', () => {
    renderComponent({
      readiness: {
        currentVersion: '0.1.0',
        verdict: 'no_components',
        nextVersions: ['0.2.0', '1.0.0', '2.0.0'],
        outdatedComponents: [],
      },
    });

    expect(screen.getByText('Add at least one component')).toBeInTheDocument();
    expect(
      screen.queryByText('Nothing has changed since 0.1.0'),
    ).not.toBeInTheDocument();
  });

  it('behind on a component — shows component info and button is still enabled', () => {
    renderComponent({
      readiness: {
        currentVersion: '0.1.0',
        verdict: 'ready',
        nextVersions: ['0.2.0', '1.0.0', '2.0.0'],
        outdatedComponents: [
          {
            family: 'skill',
            id: 's1',
            name: 'Work with Jest',
            pinnedVersion: 4,
            latestVersion: 5,
          },
        ],
      },
    });

    const behind = screen.getByText(/Work with Jest/);
    expect(behind.textContent).toContain('Work with Jest');
    expect(behind.textContent).toContain('v4');
    expect(behind.textContent).toContain('v5');
    expect(
      screen.getByRole('button', { name: /create a release/i }),
    ).toBeEnabled();
  });

  it('nothing behind — no behind-signal is rendered', () => {
    renderComponent({
      readiness: {
        currentVersion: '0.1.0',
        verdict: 'ready',
        nextVersions: ['0.2.0', '1.0.0', '2.0.0'],
        outdatedComponents: [],
      },
    });

    expect(screen.queryByText(/→/)).not.toBeInTheDocument();
  });

  it('clicking the enabled action opens the release drawer', async () => {
    renderComponent({
      readiness: {
        currentVersion: null,
        verdict: 'ready',
        nextVersions: ['0.1.0', '0.2.0', '1.0.0'],
        outdatedComponents: [],
      },
    });

    expect(screen.queryByLabelText(/version/i)).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: /create a release/i }),
    );

    expect(await screen.findByLabelText(/version/i)).toBeInTheDocument();
  });

  it('loading — renders without throwing when data is undefined', () => {
    (useListPackageReleasesQuery as Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(
      <UIProvider>
        <PackageVersionArea
          packageId={packageId}
          spaceId={spaceId}
          organizationId={organizationId}
          componentsCount={1}
        />
      </UIProvider>,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('opens the history from the badge', async () => {
    renderComponent({
      readiness: {
        currentVersion: '0.1.0',
        verdict: 'ready',
        nextVersions: ['0.2.0', '1.0.0', '2.0.0'],
        outdatedComponents: [],
      },
      releases: [{ version: '0.1.0', releasedAt: null }],
    });

    // The badge should be visible as a button
    expect(screen.getByText('0.1.0')).toBeInTheDocument();

    // Click the version badge to open history
    await userEvent.click(screen.getByRole('button', { name: /0\.1\.0/ }));

    // The drawer should open with the history title
    expect(await screen.findByText('Release history')).toBeInTheDocument();
  });

  it('the badge is not a control when nothing has been released', () => {
    renderComponent({
      readiness: {
        currentVersion: null,
        verdict: 'ready',
        nextVersions: ['0.1.0', '0.2.0', '1.0.0'],
        outdatedComponents: [],
      },
      releases: [],
    });

    // The badge should be visible with "Not released yet"
    expect(screen.getByText('Not released yet')).toBeInTheDocument();

    // It should not be clickable (no Release history drawer should open)
    // The badge should not have the appearance of a button
    const badgeElement = screen.getByText('Not released yet');
    expect(badgeElement).toBeInTheDocument();
    // The parent should be a badge, not a button control
    expect(
      badgeElement.closest('button[colorpalette="blue"]'),
    ).not.toBeInTheDocument();
  });
});
