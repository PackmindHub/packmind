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

import { PackageVersionBar } from './PackageVersionBar';
import { useListPackageReleasesQuery } from '../../api/queries/DeploymentsQueries';

vi.mock('../../api/queries/DeploymentsQueries', () => ({
  useListPackageReleasesQuery: vi.fn(),
  useCreatePackageReleaseMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
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

const onReadVersion = vi.fn();

/*
 * Annotated rather than inferred: the defaults below would otherwise fix
 * `verdict` to 'ready' and `outdatedComponents` to never[], and every case that
 * passes anything else would stop compiling. Frontend specs are type-checked
 * since #500.
 */
const renderBar = ({
  readiness = {
    currentVersion: null,
    verdict: 'ready',
    nextVersions: ['0.1.0', '0.2.0', '1.0.0'],
    outdatedComponents: [],
  },
  isLoading = false,
  componentsCount = 1,
  releases = [],
  readingVersion = null,
}: {
  readiness?: PackageReleaseReadiness;
  isLoading?: boolean;
  componentsCount?: number;
  releases?: PackageReleaseSummary[];
  readingVersion?: string | null;
} = {}) => {
  (useListPackageReleasesQuery as Mock).mockReturnValue({
    data: isLoading ? undefined : { releases, readiness },
    isLoading,
  });

  render(
    <UIProvider>
      <PackageVersionBar
        packageId={packageId}
        spaceId={spaceId}
        organizationId={organizationId}
        componentsCount={componentsCount}
        readingVersion={readingVersion}
        onReadVersion={onReadVersion}
      />
    </UIProvider>,
  );
};

/** One release cut on a fixed day, so the relative date never moves. */
const release = (
  version: string,
  releasedAt: string | null = '2026-01-05T10:00:00.000Z',
): PackageReleaseSummary => ({ version, releasedAt });

describe('PackageVersionBar', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('when the package has never been released', () => {
    const neverReleased: PackageReleaseReadiness = {
      currentVersion: null,
      verdict: 'ready',
      nextVersions: ['0.1.0', '0.2.0', '1.0.0'],
      outdatedComponents: [],
    };

    it('says so in place of a version', () => {
      renderBar({ readiness: neverReleased });

      expect(screen.getByText('Not released yet')).toBeInTheDocument();
    });

    it('never prints the 0.0.0 sentinel it is judged against', () => {
      renderBar({ readiness: neverReleased });

      expect(screen.queryByText('0.0.0')).not.toBeInTheDocument();
    });

    it('offers the first release rather than another one', () => {
      renderBar({ readiness: neverReleased });

      expect(
        screen.getByRole('button', { name: 'Create the first release' }),
      ).toBeEnabled();
    });

    it('opens the form on the action', async () => {
      renderBar({ readiness: neverReleased });

      await userEvent.click(
        screen.getByRole('button', { name: 'Create the first release' }),
      );

      expect(await screen.findByLabelText(/version/i)).toBeInTheDocument();
    });

    it('offers nothing while the package holds no component', () => {
      renderBar({
        readiness: { ...neverReleased, verdict: 'no_components' },
      });

      expect(
        screen.queryByRole('button', { name: /release/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the working copy is ahead of the last release', () => {
    const ahead: PackageReleaseReadiness = {
      currentVersion: '0.1.0',
      verdict: 'ready',
      nextVersions: ['0.1.1', '0.2.0', '1.0.0'],
      outdatedComponents: [],
    };

    it('names what is on screen', () => {
      renderBar({ readiness: ahead, releases: [release('0.1.0')] });

      expect(
        screen.getByRole('button', { name: /Working copy/ }),
      ).toBeInTheDocument();
    });

    it('says how far it stands from the release', () => {
      renderBar({ readiness: ahead, releases: [release('0.1.0')] });

      expect(
        screen.getByText('Unreleased changes since 0.1.0'),
      ).toBeInTheDocument();
    });

    it('offers to cut a release', () => {
      renderBar({ readiness: ahead, releases: [release('0.1.0')] });

      expect(
        screen.getByRole('button', { name: 'Create a release' }),
      ).toBeEnabled();
    });
  });

  describe('when the working copy is identical to the last release', () => {
    const unchanged: PackageReleaseReadiness = {
      currentVersion: '0.1.0',
      verdict: 'no_change',
      nextVersions: ['0.1.1', '0.2.0', '1.0.0'],
      outdatedComponents: [],
    };

    it('says it is identical rather than greying an action', () => {
      renderBar({ readiness: unchanged, releases: [release('0.1.0')] });

      expect(screen.getByText('Identical to 0.1.0')).toBeInTheDocument();
    });

    it('offers no release at all', () => {
      renderBar({ readiness: unchanged, releases: [release('0.1.0')] });

      expect(
        screen.queryByRole('button', { name: /Create a release/ }),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the package was emptied after a release', () => {
    it('names the emptying rather than the absence of components', () => {
      renderBar({
        readiness: {
          currentVersion: '0.1.0',
          verdict: 'no_components',
          nextVersions: ['0.1.1', '0.2.0', '1.0.0'],
          outdatedComponents: [],
        },
        releases: [release('0.1.0')],
      });

      expect(screen.getByText('Emptied since 0.1.0')).toBeInTheDocument();
    });
  });

  describe('when components have moved on since the last release', () => {
    const behind: PackageReleaseReadiness = {
      currentVersion: '0.1.0',
      verdict: 'ready',
      nextVersions: ['0.1.1', '0.2.0', '1.0.0'],
      outdatedComponents: [
        {
          family: 'skill',
          id: 's1',
          name: 'Work with Jest',
          pinnedVersion: 4,
          latestVersion: 5,
        },
      ],
    };

    it('counts them beside the sentence', () => {
      renderBar({ readiness: behind, releases: [release('0.1.0')] });

      expect(
        screen.getByRole('button', { name: '1 newer component' }),
      ).toBeInTheDocument();
    });

    it('keeps them out of the bar until they are asked for', () => {
      renderBar({ readiness: behind, releases: [release('0.1.0')] });

      expect(screen.queryByText('Work with Jest')).not.toBeInTheDocument();
    });

    it('names each of them behind the disclosure', async () => {
      renderBar({ readiness: behind, releases: [release('0.1.0')] });

      await userEvent.click(
        screen.getByRole('button', { name: '1 newer component' }),
      );

      expect(await screen.findByText('Work with Jest')).toBeInTheDocument();
    });
  });

  describe('when the reader opens the versions', () => {
    const ahead: PackageReleaseReadiness = {
      currentVersion: '0.2.0',
      verdict: 'ready',
      nextVersions: ['0.2.1', '0.3.0', '1.0.0'],
      outdatedComponents: [],
    };

    it('lists every release behind the ref control', async () => {
      renderBar({
        readiness: ahead,
        releases: [release('0.2.0'), release('0.1.0')],
      });

      await userEvent.click(
        screen.getByRole('button', { name: /Working copy/ }),
      );

      expect(await screen.findByText('0.1.0')).toBeInTheDocument();
    });

    it('hands the picked version back', async () => {
      renderBar({
        readiness: ahead,
        releases: [release('0.2.0'), release('0.1.0')],
      });

      await userEvent.click(
        screen.getByRole('button', { name: /Working copy/ }),
      );
      await userEvent.click(await screen.findByText('0.1.0'));

      expect(onReadVersion).toHaveBeenCalledWith('0.1.0');
    });
  });

  describe('when a release is on screen', () => {
    const ahead: PackageReleaseReadiness = {
      currentVersion: '0.2.0',
      verdict: 'ready',
      nextVersions: ['0.2.1', '0.3.0', '1.0.0'],
      outdatedComponents: [],
    };
    const releases = [release('0.2.0'), release('0.1.0')];

    it('names it in place of the working copy', () => {
      renderBar({ readiness: ahead, releases, readingVersion: '0.1.0' });

      expect(
        screen.getByRole('button', { name: /0\.1\.0/ }),
      ).toBeInTheDocument();
    });

    it('dates it rather than comparing it to itself', () => {
      renderBar({ readiness: ahead, releases, readingVersion: '0.1.0' });

      expect(
        screen.queryByText('Unreleased changes since 0.2.0'),
      ).not.toBeInTheDocument();
    });

    it('offers no cut from a past reading', () => {
      renderBar({ readiness: ahead, releases, readingVersion: '0.1.0' });

      expect(
        screen.queryByRole('button', { name: /Create a release/ }),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the versions are still being read', () => {
    it('holds the row rather than offering a control', () => {
      renderBar({ isLoading: true });

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });
});
