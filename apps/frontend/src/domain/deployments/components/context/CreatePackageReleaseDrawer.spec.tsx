import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import {
  createOrganizationId,
  createPackageId,
  createSpaceId,
  type PackageReleaseReadiness,
} from '@packmind/types';
import type { Mock } from 'vitest';

import { CreatePackageReleaseDrawer } from './CreatePackageReleaseDrawer';
import {
  PackmindError,
  type ServerErrorResponse,
} from '../../../../services/api/errors/PackmindError';
import { useCreatePackageReleaseMutation } from '../../api/queries/DeploymentsQueries';

vi.mock('../../api/queries/DeploymentsQueries', () => ({
  useCreatePackageReleaseMutation: vi.fn(),
}));

const mockTrack = vi.fn();

vi.mock(
  '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider',
  () => ({
    useAnalytics: () => ({ track: mockTrack }),
  }),
);

const packageId = createPackageId('pkg-1');
const spaceId = createSpaceId('space-1');
const organizationId = createOrganizationId('org-1');

const readinessOf = (
  currentVersion: string | null,
  nextVersions: [string, string, string],
): PackageReleaseReadiness => ({
  currentVersion,
  verdict: 'ready',
  nextVersions,
  outdatedComponents: [],
});

const renderDrawer = ({
  readiness = readinessOf(null, ['0.0.1', '0.1.0', '1.0.0']),
  componentsCount = 3,
  mutateAsync = vi.fn().mockResolvedValue({ release: { version: '0.1.0' } }),
  isPending = false,
  onOpenChange = vi.fn(),
}: {
  readiness?: PackageReleaseReadiness;
  componentsCount?: number;
  mutateAsync?: Mock;
  isPending?: boolean;
  onOpenChange?: Mock;
} = {}) => {
  (useCreatePackageReleaseMutation as Mock).mockReturnValue({
    mutateAsync,
    isPending,
  });

  render(
    <UIProvider>
      <CreatePackageReleaseDrawer
        packageId={packageId}
        spaceId={spaceId}
        organizationId={organizationId}
        readiness={readiness}
        componentsCount={componentsCount}
        open
        onOpenChange={onOpenChange}
      />
    </UIProvider>,
  );

  return { mutateAsync, onOpenChange };
};

const versionField = () =>
  screen.getByLabelText(/version/i) as HTMLInputElement;

const submit = () => screen.getByRole('button', { name: 'Release' });

const typeVersion = async (value: string) => {
  await userEvent.clear(versionField());
  await userEvent.type(versionField(), value);
};

describe('CreatePackageReleaseDrawer', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('offers the three next increments', () => {
    renderDrawer({
      readiness: readinessOf('0.1.0', ['0.1.1', '0.2.0', '1.0.0']),
    });

    expect(screen.getByRole('button', { name: '0.1.1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '0.2.0' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1.0.0' })).toBeInTheDocument();
  });

  it('pre-fills the patch increment', () => {
    renderDrawer({
      readiness: readinessOf('0.1.0', ['0.1.1', '0.2.0', '1.0.0']),
    });

    expect(versionField()).toHaveValue('0.1.1');
  });

  it('pre-fills 0.1.0 for a first release', () => {
    renderDrawer({
      readiness: readinessOf(null, ['0.0.1', '0.1.0', '1.0.0']),
    });

    expect(versionField()).toHaveValue('0.1.0');
    expect(screen.queryByText('0.0.0')).not.toBeInTheDocument();
  });

  it('clicking an increment fills the field', async () => {
    renderDrawer({
      readiness: readinessOf('0.1.0', ['0.1.1', '0.2.0', '1.0.0']),
    });

    await userEvent.click(screen.getByRole('button', { name: '1.0.0' }));

    expect(versionField()).toHaveValue('1.0.0');
  });

  it('refuses a malformed version and keeps it', async () => {
    const { mutateAsync } = renderDrawer({
      readiness: readinessOf('0.1.0', ['0.1.1', '0.2.0', '1.0.0']),
    });

    await typeVersion('1,2,3');
    await userEvent.click(submit());

    expect(
      await screen.findByText('Version must follow X.Y.Z'),
    ).toBeInTheDocument();
    expect(versionField()).toHaveValue('1,2,3');
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('refuses a lower version', async () => {
    const { mutateAsync } = renderDrawer({
      readiness: readinessOf('1.2.0', ['1.2.1', '1.3.0', '2.0.0']),
    });

    await typeVersion('1.1.0');
    await userEvent.click(submit());

    expect(
      await screen.findByText('Version must be greater than 1.2.0'),
    ).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('refuses the current version', async () => {
    const { mutateAsync } = renderDrawer({
      readiness: readinessOf('1.2.0', ['1.2.1', '1.3.0', '2.0.0']),
    });

    await typeVersion('1.2.0');
    await userEvent.click(submit());

    expect(
      await screen.findByText('Version must be greater than 1.2.0'),
    ).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('refuses a greater non-increment', async () => {
    const { mutateAsync } = renderDrawer({
      readiness: readinessOf('0.1.0', ['0.1.1', '0.2.0', '1.0.0']),
    });

    await typeVersion('0.5.0');
    await userEvent.click(submit());

    expect(
      await screen.findByText('Version must follow X.Y.Z'),
    ).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('submits a valid version', async () => {
    const { mutateAsync } = renderDrawer({
      readiness: readinessOf('0.1.0', ['0.1.1', '0.2.0', '1.0.0']),
    });

    await userEvent.click(screen.getByRole('button', { name: '0.2.0' }));
    await userEvent.click(submit());

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync).toHaveBeenCalledWith({
      packageId,
      spaceId,
      organizationId,
      version: '0.2.0',
    });
  });

  it('tracks a release', async () => {
    renderDrawer({
      readiness: readinessOf('0.1.0', ['0.1.1', '0.2.0', '1.0.0']),
      componentsCount: 4,
    });

    await userEvent.click(submit());

    await waitFor(() =>
      expect(mockTrack).toHaveBeenCalledWith(
        'package_version_released',
        expect.objectContaining({ packageId, version: '0.1.1' }),
      ),
    );
  });

  /**
   * The 400 the release endpoint answers with, as the shared client hands it
   * to the caller: a message the user never reads, plus the two fields the
   * sentence is built from.
   */
  const serverRefusal = (code: string, currentVersion: string) =>
    new PackmindError({
      data: {
        message: `Package release refused: ${code}`,
        code,
        currentVersion,
      },
      status: 400,
      statusText: 'Bad Request',
    } as ServerErrorResponse);

  it("names the server's own current version when it refuses the cut", async () => {
    renderDrawer({
      readiness: readinessOf('0.1.0', ['0.1.1', '0.2.0', '1.0.0']),
      mutateAsync: vi
        .fn()
        .mockRejectedValue(serverRefusal('not_greater', '0.2.0')),
    });

    await typeVersion('0.2.0');
    await userEvent.click(submit());

    // 0.2.0, not the stale 0.1.0 the page still believes is current.
    expect(
      await screen.findByText('Version must be greater than 0.2.0'),
    ).toBeInTheDocument();
    expect(versionField()).toHaveValue('0.2.0');
  });

  it('tracks a refusal coming from the server', async () => {
    renderDrawer({
      readiness: readinessOf('0.1.0', ['0.1.1', '0.2.0', '1.0.0']),
      mutateAsync: vi
        .fn()
        .mockRejectedValue(serverRefusal('not_greater', '0.2.0')),
    });

    await typeVersion('0.2.0');
    await userEvent.click(submit());

    await waitFor(() =>
      expect(mockTrack).toHaveBeenCalledWith(
        'package_release_refused',
        expect.objectContaining({
          packageId,
          attemptedVersion: '0.2.0',
          refusalReason: 'not_greater',
        }),
      ),
    );
  });

  it('keeps the drawer open when the server refuses', async () => {
    const { onOpenChange } = renderDrawer({
      readiness: readinessOf('0.1.0', ['0.1.1', '0.2.0', '1.0.0']),
      mutateAsync: vi
        .fn()
        .mockRejectedValue(serverRefusal('not_greater', '0.2.0')),
    });

    await typeVersion('0.2.0');
    await userEvent.click(submit());

    await screen.findByText('Version must be greater than 0.2.0');
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('tracks a refusal', async () => {
    renderDrawer({
      readiness: readinessOf('0.1.0', ['0.1.1', '0.2.0', '1.0.0']),
    });

    await typeVersion('1,2,3');
    await userEvent.click(submit());

    await waitFor(() =>
      expect(mockTrack).toHaveBeenCalledWith(
        'package_release_refused',
        expect.objectContaining({
          packageId,
          attemptedVersion: '1,2,3',
          refusalReason: 'malformed',
        }),
      ),
    );
  });

  describe('after the server has named a newer current version', () => {
    /**
     * The page read 0.1.0; a release landed behind the open form and the server
     * is at 0.2.0. Everything the form judges against has to move with it, or
     * the only version it will now accept is the one the stale suggestions
     * happen to share.
     */
    const raceLost = () => ({
      readiness: readinessOf('0.1.0', ['0.1.1', '0.2.0', '1.0.0']),
      mutateAsync: vi
        .fn()
        .mockRejectedValueOnce(serverRefusal('not_greater', '0.2.0'))
        .mockResolvedValue({ release: { version: '0.2.1' } }),
    });

    const loseTheRace = async () => {
      await typeVersion('0.2.0');
      await userEvent.click(submit());
      await screen.findByText('Version must be greater than 0.2.0');
    };

    it('offers the increments over that version', async () => {
      renderDrawer(raceLost());

      await loseTheRace();

      expect(screen.getByRole('button', { name: '0.2.1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '0.3.0' })).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: '0.1.1' }),
      ).not.toBeInTheDocument();
    });

    it('lets the version it would now accept reach the server', async () => {
      const { mutateAsync } = renderDrawer(raceLost());

      await loseTheRace();
      await typeVersion('0.2.1');
      await userEvent.click(submit());

      await waitFor(() =>
        expect(mutateAsync).toHaveBeenLastCalledWith(
          expect.objectContaining({ version: '0.2.1' }),
        ),
      );
    });

    it('refuses against that version rather than the stale one', async () => {
      renderDrawer(raceLost());

      await loseTheRace();
      await typeVersion('0.1.1');
      await userEvent.click(submit());

      expect(
        await screen.findByText('Version must be greater than 0.2.0'),
      ).toBeInTheDocument();
    });
  });

  it('states why it refuses a version on a package never released', async () => {
    const { mutateAsync } = renderDrawer({
      readiness: readinessOf(null, ['0.0.1', '0.1.0', '1.0.0']),
    });

    await typeVersion('0.0.0');
    await userEvent.click(submit());

    // Without a version to name, this refusal used to render nothing at all and
    // the button simply did nothing.
    expect(
      await screen.findByText('Version must be greater than 0.0.0'),
    ).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
