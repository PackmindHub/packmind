import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { UIProvider } from '@packmind/ui';
import {
  createOrganizationId,
  createPackageId,
  createSpaceId,
  createStandardId,
  type PackageResponse,
  type Standard,
  type StandardId,
} from '@packmind/types';
import type { Mock } from 'vitest';

import { AddComponentsDrawer } from './AddComponentsDrawer';
import { useAddArtefactsToPackagesMutation } from '../../api/queries/DeploymentsQueries';
import { usePackageDeploymentStatus } from '../../hooks/usePackageDeploymentStatus';
import type { SpaceCatalogue } from './buildPackageContext';

vi.mock('../../api/queries/DeploymentsQueries', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../api/queries/DeploymentsQueries')
  >()),
  useAddArtefactsToPackagesMutation: vi.fn(),
}));

vi.mock('../../hooks/usePackageDeploymentStatus', () => ({
  usePackageDeploymentStatus: vi.fn(),
}));

/**
 * Stubbed, and the stub is the point of the boundary. What this drawer owes the
 * reader is a way to create from inside it; which four ways those are, and what
 * each of them opens, belongs to the menu and is asserted where the menu lives.
 * Rendering the real one here would pull the samples modal, the import panel and
 * the agent dialog into a test about a footer.
 */
vi.mock('./ContextCreateMenu', () => ({
  ContextCreateMenu: () => <button type="button">Create a component</button>,
}));

const spaceId = createSpaceId('space-1');
const organizationId = createOrganizationId('org-1');

const standard = (id: string, name: string): Standard =>
  ({
    id: createStandardId(id),
    name,
    slug: name.toLowerCase(),
    description: '',
    version: 1,
  }) as Standard;

const NAMING = standard('s1', 'Naming conventions');
/** A candidate some other package already carries, so it is not an orphan. */
const SHIPPED = standard('s2', 'Error handling');

const emptyCatalogue: SpaceCatalogue = {
  standards: [],
  commands: [],
  skills: [],
};

/** Membership is ids, which is what the drawer reads it as. */
const pkg = (holds: readonly StandardId[] = []): PackageResponse =>
  ({
    id: createPackageId('pkg-1'),
    name: 'Backend guidelines',
    standards: holds,
    commands: [],
    skills: [],
  }) as unknown as PackageResponse;

/** Another package in the space, named so a row can say who carries what. */
const otherPackage = (holds: readonly StandardId[]): PackageResponse =>
  ({
    id: createPackageId('pkg-2'),
    name: 'Legacy guidelines',
    standards: holds,
    commands: [],
    skills: [],
  }) as unknown as PackageResponse;

function renderDrawer({
  catalogue = { ...emptyCatalogue, standards: [NAMING] },
  holds = [] as readonly StandardId[],
  alongside = [] as readonly PackageResponse[],
  mutateAsync = vi.fn().mockResolvedValue([{ ok: true }]),
}: {
  catalogue?: SpaceCatalogue;
  holds?: readonly StandardId[];
  alongside?: readonly PackageResponse[];
  mutateAsync?: Mock;
} = {}) {
  (useAddArtefactsToPackagesMutation as Mock).mockReturnValue({
    mutateAsync,
    isPending: false,
  });
  (usePackageDeploymentStatus as Mock).mockReturnValue({
    getDeployedTargets: () => [],
    getDeployedMarketplaces: () => [],
  });

  const tree = (
    holdsNow: readonly StandardId[],
    alongsideNow: readonly PackageResponse[],
  ) => (
    <MemoryRouter>
      <UIProvider>
        <AddComponentsDrawer
          open
          onOpenChange={vi.fn()}
          pkg={pkg(holdsNow)}
          packages={[pkg(holdsNow), ...alongsideNow]}
          catalogue={catalogue}
          spaceId={spaceId}
          organizationId={organizationId}
          orgSlug="acme"
          spaceSlug="platform"
        />
      </UIProvider>
    </MemoryRouter>
  );

  const { rerender } = render(tree(holds, alongside));

  /**
   * The same open drawer, told that the space has moved under it. Which is what
   * happens when another reader puts the last free candidate into a package
   * while this one is picking.
   */
  const withPackages = (alongsideNow: readonly PackageResponse[]) =>
    rerender(tree(holds, alongsideNow));

  return { mutateAsync, withPackages };
}

const createControl = () =>
  screen.queryByRole('button', { name: 'Create a component' });

describe('AddComponentsDrawer', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('when the space has something left to pick', () => {
    it('offers the pick it was opened for', async () => {
      renderDrawer();

      await userEvent.click(
        screen.getByRole('checkbox', { name: /Naming conventions/ }),
      );

      expect(
        screen.getByRole('button', { name: 'Add 1 standard' }),
      ).toBeInTheDocument();
    });

    it('names creating where it names the package', () => {
      renderDrawer();

      expect(createControl()).toBeInTheDocument();
    });
  });

  /*
   * The state the create menu was unreachable from: the way out used to be a
   * chevron in the header behind this drawer.
   */
  describe('when the package already holds everything', () => {
    const full = { holds: [NAMING.id] };

    it('says so', () => {
      renderDrawer(full);

      expect(
        screen.getByText(
          'Backend guidelines already holds everything in this space.',
        ),
      ).toBeInTheDocument();
    });

    it('still offers creating, in the same place', () => {
      renderDrawer(full);

      expect(createControl()).toBeInTheDocument();
    });

    it('drops the confirmation nothing could enable', () => {
      renderDrawer(full);

      expect(
        screen.queryByRole('button', { name: /^Add/ }),
      ).not.toBeInTheDocument();
    });

    it('does not name a second way out', () => {
      renderDrawer(full);

      expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(1);
    });
  });

  /*
   * The drawer opens on the components no package carries, which is the filter
   * that would show nothing here: every candidate already ships from somewhere
   * else. It resolves that filter once, when it opens, against the count of
   * that moment.
   */
  describe('when every candidate already ships from another package', () => {
    const allShipped = {
      catalogue: { ...emptyCatalogue, standards: [NAMING, SHIPPED] },
      holds: [NAMING.id],
      alongside: [otherPackage([SHIPPED.id])],
    };

    it('opens on the whole list rather than behind a filter hiding it', () => {
      renderDrawer(allShipped);

      expect(
        screen.getByRole('checkbox', { name: /Error handling/ }),
      ).toBeInTheDocument();
    });

    it('offers no filter that would empty the list', () => {
      renderDrawer(allShipped);

      expect(
        screen.queryByRole('button', { name: /In no package/ }),
      ).not.toBeInTheDocument();
    });

    it('says what the list is, not what the filter would have shown', () => {
      renderDrawer(allShipped);

      expect(screen.getByText(/does not hold yet/)).toBeInTheDocument();
    });

    it('names the package already carrying it', () => {
      renderDrawer(allShipped);

      expect(screen.getByText('In Legacy guidelines')).toBeInTheDocument();
    });

    it('still confirms a pick', () => {
      renderDrawer(allShipped);

      expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    });
  });

  /*
   * The filter cannot strand the reader either, which is the harder half: the
   * count it filters on can fall to zero while the drawer stands, and the chip
   * that would undo it is drawn only while both populations exist.
   */
  describe('when the last free candidate is taken while the drawer is open', () => {
    it('keeps showing it rather than emptying the list behind the filter', () => {
      const { withPackages } = renderDrawer();

      withPackages([otherPackage([NAMING.id])]);

      expect(
        screen.getByRole('checkbox', { name: /Naming conventions/ }),
      ).toBeInTheDocument();
    });

    it('never answers a search nobody typed', () => {
      const { withPackages } = renderDrawer();

      withPackages([otherPackage([NAMING.id])]);

      expect(screen.queryByText(/Nothing matches/)).not.toBeInTheDocument();
    });

    it('says what the list has become', () => {
      const { withPackages } = renderDrawer();

      withPackages([otherPackage([NAMING.id])]);

      expect(screen.getByText(/does not hold yet/)).toBeInTheDocument();
    });
  });

  describe('when the space owns nothing at all', () => {
    const bare = { catalogue: emptyCatalogue };

    it('says what is missing', () => {
      renderDrawer(bare);

      expect(
        screen.getByText('This space has no standard, command or skill yet.'),
      ).toBeInTheDocument();
    });

    it('gives the same instruction as a full package does', () => {
      renderDrawer(bare);

      expect(
        screen.getByText(/joins Backend guidelines as it is created/),
      ).toBeInTheDocument();
    });
  });
});
