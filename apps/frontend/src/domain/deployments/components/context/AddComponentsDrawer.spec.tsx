import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { UIProvider } from '@packmind/ui';
import {
  createOrganizationId,
  createPackageId,
  createSkillId,
  createSpaceId,
  createStandardId,
  type PackageResponse,
  type Skill,
  type SkillId,
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

const skill = (id: string, name: string): Skill =>
  ({
    id: createSkillId(id),
    name,
    slug: name.toLowerCase().replace(/ /g, '-'),
    description: '',
    version: 1,
  }) as Skill;

const NAMING = standard('s1', 'Naming conventions');
/** A candidate some other package already carries, so it is not an orphan. */
const SHIPPED = standard('s2', 'Error handling');
/** A second type, so the list has something for the type chips to narrow. */
const REVIEWING = skill('k1', 'Reviewing a diff');

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

/**
 * A package carrying the skill rather than a standard, which is what makes a
 * type have candidates and none of them free.
 */
const skillPackage = (holds: readonly SkillId[]): PackageResponse =>
  ({
    id: createPackageId('pkg-3'),
    name: 'Review guidelines',
    standards: [],
    commands: [],
    skills: holds,
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

      expect(screen.queryByText(/matches/)).not.toBeInTheDocument();
    });

    it('says what the list has become', () => {
      const { withPackages } = renderDrawer();

      withPackages([otherPackage([NAMING.id])]);

      expect(screen.getByText(/does not hold yet/)).toBeInTheDocument();
    });
  });

  /*
   * The reason the chips exist: a space of four hundred loose components
   * arrives here as one list of every type, and reaching the skills meant
   * typing a word they happen to share.
   */
  describe('when the candidates span several types', () => {
    const mixed = {
      catalogue: {
        ...emptyCatalogue,
        standards: [NAMING],
        skills: [REVIEWING],
      },
    };

    const chip = (name: string) => screen.getByRole('button', { name });

    it('offers one chip per type among the candidates', () => {
      renderDrawer(mixed);

      expect(chip('Standards, 1')).toBeInTheDocument();
      expect(chip('Skills, 1')).toBeInTheDocument();
    });

    it('narrows the list to the type picked', async () => {
      renderDrawer(mixed);

      await userEvent.click(chip('Skills, 1'));

      expect(
        screen.getByRole('checkbox', { name: /Reviewing a diff/ }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('checkbox', { name: /Naming conventions/ }),
      ).not.toBeInTheDocument();
    });

    it('gives the whole list back', async () => {
      renderDrawer(mixed);

      await userEvent.click(chip('Skills, 1'));
      await userEvent.click(chip('All, 2'));

      expect(
        screen.getByRole('checkbox', { name: /Naming conventions/ }),
      ).toBeInTheDocument();
    });

    /*
     * A pick is a decision about a component; narrowing the list is a way of
     * reaching one. The second must not undo the first, or a reader working
     * type by type loses everything at each chip.
     */
    it('keeps what was picked under another chip', async () => {
      renderDrawer(mixed);

      await userEvent.click(
        screen.getByRole('checkbox', { name: /Naming conventions/ }),
      );
      await userEvent.click(chip('Skills, 1'));

      expect(
        screen.getByRole('button', { name: 'Add 1 standard' }),
      ).toBeInTheDocument();
    });
  });

  /*
   * The state the type filter was reported missing in, after it had shipped:
   * the drawer opens on the components in no package, and a space whose free
   * components happen to be all of one type opened on no chip row at all. The
   * control was derived from what the coverage filter left, so the filter the
   * reader never turned on hid the filter they were looking for.
   */
  describe('when the coverage filter leaves a single type', () => {
    const oneTypeFree = {
      catalogue: {
        ...emptyCatalogue,
        standards: [NAMING],
        skills: [REVIEWING],
      },
      alongside: [skillPackage([REVIEWING.id])],
    };

    const chip = (name: string) => screen.getByRole('button', { name });

    it('keeps one chip per type the package is missing something of', () => {
      renderDrawer(oneTypeFree);

      expect(chip('Standards, 1')).toBeInTheDocument();
      expect(chip('Skills, 0')).toBeInTheDocument();
    });

    it('names the type rather than answering a search nobody typed', async () => {
      renderDrawer(oneTypeFree);

      await userEvent.click(chip('Skills, 0'));

      expect(
        screen.getByText(
          'Every skill Backend guidelines does not hold is already in a package.',
        ),
      ).toBeInTheDocument();
    });

    /*
     * The pick is what the chip row is for; releasing the coverage filter is
     * the way to reach the rows it counts.
     */
    it('shows the type once the coverage filter is released', async () => {
      renderDrawer(oneTypeFree);

      await userEvent.click(chip('Skills, 0'));
      await userEvent.click(chip('In no package, 1'));

      expect(
        screen.getByRole('checkbox', { name: /Reviewing a diff/ }),
      ).toBeInTheDocument();
    });
  });

  describe('when the candidates are all of one type', () => {
    it('offers no chip with nothing to narrow', () => {
      renderDrawer();

      expect(
        screen.queryByRole('button', { name: /^All,/ }),
      ).not.toBeInTheDocument();
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
