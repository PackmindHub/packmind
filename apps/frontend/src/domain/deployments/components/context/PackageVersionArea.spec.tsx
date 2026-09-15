import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import {
  createOrganizationId,
  createPackageId,
  createSpaceId,
} from '@packmind/types';
import type { Mock } from 'vitest';

import { PackageVersionArea } from './PackageVersionArea';
import { useListPackageReleasesQuery } from '../../api/queries/DeploymentsQueries';

vi.mock('../../api/queries/DeploymentsQueries', () => ({
  useListPackageReleasesQuery: vi.fn(),
}));

const packageId = createPackageId('pkg-1');
const spaceId = createSpaceId('space-1');
const organizationId = createOrganizationId('org-1');

const renderComponent = ({
  readiness = {
    currentVersion: null,
    verdict: 'ready' as const,
    nextVersions: ['0.1.0', '0.2.0', '1.0.0'] as [string, string, string],
    outdatedComponents: [],
  },
  isLoading = false,
  onCreateRelease = vi.fn(),
} = {}) => {
  (useListPackageReleasesQuery as Mock).mockReturnValue({
    data: {
      releases: [],
      readiness,
    },
    isLoading,
  });

  render(
    <UIProvider>
      <PackageVersionArea
        packageId={packageId}
        spaceId={spaceId}
        organizationId={organizationId}
        onCreateRelease={onCreateRelease}
      />
    </UIProvider>,
  );

  return { onCreateRelease };
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

  it('clicking the enabled action calls onCreateRelease once', async () => {
    const { onCreateRelease } = renderComponent({
      readiness: {
        currentVersion: null,
        verdict: 'ready',
        nextVersions: ['0.1.0', '0.2.0', '1.0.0'],
        outdatedComponents: [],
      },
    });

    await userEvent.click(
      screen.getByRole('button', { name: /create a release/i }),
    );

    expect(onCreateRelease).toHaveBeenCalledTimes(1);
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
          onCreateRelease={vi.fn()}
        />
      </UIProvider>,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
