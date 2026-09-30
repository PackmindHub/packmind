import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import {
  Link,
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useSearchParams,
} from 'react-router';
import { UIProvider } from '@packmind/ui';
import type { Mock } from 'vitest';
import {
  createOrganizationId,
  createPackageId,
  createSkillId,
  createSpaceId,
  createStandardId,
} from '@packmind/types';
import type { PackageResponse, Skill, Standard } from '@packmind/types';

import { SpaceContextSurface } from './SpaceContextSurface';
import { componentBackLink } from './buildComponentDetail';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useListPackagesBySpaceQuery } from '../../api/queries/DeploymentsQueries';
import { useGetStandardsQuery } from '../../../standards/api/queries/StandardsQueries';
import { useGetCommandsQuery } from '../../../commands/api/queries/CommandsQueries';
import { useGetSkillsQuery } from '../../../skills/api/queries/SkillsQueries';
import { useDeleteContextComponents } from './useDeleteContextComponents';

/*
 * Every query this surface and its rail reach for is mocked at its module path,
 * so no `QueryClientProvider` is needed - the arrangement the pane specs beside
 * this one use.
 */
vi.mock('../../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: vi.fn(),
}));

vi.mock('../../../spaces/hooks/useCurrentSpace', () => ({
  useCurrentSpace: vi.fn(),
}));

vi.mock('../../api/queries/DeploymentsQueries', () => ({
  useListPackagesBySpaceQuery: vi.fn(),
  useDeletePackagesBatchMutation: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('../../../standards/api/queries/StandardsQueries', () => ({
  useGetStandardsQuery: vi.fn(),
  useGetRulesByStandardIdQuery: () => ({ data: [] }),
}));

vi.mock('../../../commands/api/queries/CommandsQueries', () => ({
  useGetCommandsQuery: vi.fn(),
}));

vi.mock('../../../skills/api/queries/SkillsQueries', () => ({
  useGetSkillsQuery: vi.fn(),
  useGetSkillWithFilesByIdQuery: () => ({ data: undefined }),
}));

vi.mock('./usePackageDrift', () => ({
  useSpaceDrift: () => ({ packages: [], isError: false }),
}));

vi.mock(
  '@packmind/proprietary/frontend/domain/spaces/components/overview/useSpaceOutdatedPlugins',
  () => ({
    useSpaceOutdatedPlugins: () => ({ outdatedPlugins: [] }),
  }),
);

vi.mock('./useDeleteContextComponents', () => ({
  useDeleteContextComponents: vi.fn(),
}));

vi.mock(
  '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries',
  () => ({
    useGetGroupedChangeProposalsQuery: () => ({ data: undefined }),
  }),
);

vi.mock('./MoveComponentDrawer', () => ({
  MoveComponentDrawer: () => <div data-testid="move-drawer" />,
}));

vi.mock('./CreatePackageDrawer', () => ({
  CreatePackageDrawer: ({
    onOpenChange,
    onCreated,
  }: {
    onOpenChange: (open: boolean) => void;
    onCreated: (packageId: string) => void;
  }) => (
    <div data-testid="create-package-drawer">
      <button onClick={() => onOpenChange(false)}>Cancel</button>
      <button
        onClick={() => {
          onOpenChange(false);
          onCreated('pkg-1');
        }}
      >
        Create
      </button>
    </div>
  ),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

/*
 * Stood in for by the one thing this test asks of it: the way back out of the
 * component it is showing. The link is built by the production helper the real
 * pane hands its detail, so what is clicked below is the address the surface
 * would really be sent to; the rest of that pane is a screenful of queries
 * none of this reads.
 */
vi.mock('./ContextPackagePane', () => ({
  ContextPackagePane: ({ pkg }: { pkg: PackageResponse }) => {
    const [searchParams] = useSearchParams();
    const back = componentBackLink(searchParams, pkg);
    return <Link to={back.href}>{back.label}</Link>;
  },
}));

const spaceId = createSpaceId('space-1');
const organizationId = createOrganizationId('org-1');

const STANDARD = {
  id: createStandardId('std-1'),
  name: 'Naming',
  description: '',
  version: 1,
} as Standard;

const SKILL = {
  id: createSkillId('skill-1'),
  slug: 'onboarding',
  name: 'Onboarding',
  description: '',
  version: 1,
} as Skill;

const PACKAGE = {
  id: createPackageId('pkg-1'),
  name: 'Backend conventions',
  slug: 'backend-conventions',
  description: '',
  spaceId,
  standards: [STANDARD.id],
  skills: [],
  commands: [],
  recipes: [],
};

async function renderSurface(address: string) {
  (useAuthContext as Mock).mockReturnValue({
    organization: { id: organizationId, slug: 'acme' },
    user: { email: 'someone@packmind.com' },
  });
  (useCurrentSpace as Mock).mockReturnValue({ spaceId, isLoading: false });
  (useListPackagesBySpaceQuery as Mock).mockReturnValue({
    data: { packages: [PACKAGE] },
    isLoading: false,
    isError: false,
  });
  (useGetStandardsQuery as Mock).mockReturnValue({
    data: { standards: [STANDARD] },
    isLoading: false,
  });
  (useGetCommandsQuery as Mock).mockReturnValue({
    data: [],
    isLoading: false,
  });
  (useGetSkillsQuery as Mock).mockReturnValue({
    data: [SKILL],
    isLoading: false,
  });
  (useDeleteContextComponents as Mock).mockReturnValue({
    deleteComponents: vi.fn().mockResolvedValue({ deleted: [], failed: [] }),
    isDeleting: false,
  });

  await act(async () => {
    render(
      <UIProvider>
        <MemoryRouter
          initialEntries={[`/org/acme/space/backend/context${address}`]}
        >
          <Routes>
            <Route
              path="/org/:orgSlug/space/:spaceSlug/context"
              element={
                <>
                  <SpaceContextSurface />
                  <LocationProbe />
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      </UIProvider>,
    );
  });
}

/*
 * The inventory's rows name no package, so opening one swaps the pane for the
 * package that happens to carry the component. Everything the reader had picked
 * lived in the pane that was swapped out, which is the one list where it cannot
 * be picked again from memory: the components are spread across every package
 * of the space.
 */
describe('SpaceContextSurface', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('a selection made in All components', () => {
    it('is still there on the way back from one of its components', async () => {
      await renderSurface('?package=all');

      await userEvent.click(
        screen.getByRole('checkbox', { name: 'Select Onboarding' }),
      );
      expect(screen.getByText('1 selected')).toBeVisible();

      await userEvent.click(screen.getByRole('link', { name: /Naming/ }));
      await userEvent.click(
        screen.getByRole('link', { name: 'All components' }),
      );

      expect(screen.getByText('1 selected')).toBeVisible();
    });
    /*
     * And it is a gesture, not a place: it belongs to the list it was made in,
     * so leaving that list for another one ends it. This is what unmounting the
     * pane used to do and the only part of it worth keeping.
     */
    it('is dropped once the reader leaves for a package', async () => {
      await renderSurface('?package=all');

      await userEvent.click(
        screen.getByRole('checkbox', { name: 'Select Onboarding' }),
      );
      await userEvent.click(
        screen.getByRole('button', { name: /Backend conventions/ }),
      );
      await userEvent.click(
        screen.getByRole('button', { name: /All components/ }),
      );

      expect(screen.queryByText('1 selected')).toBeNull();
    });
  });

  describe('package creation in the address', () => {
    const search = () => screen.getByTestId('location-search').textContent;

    describe('when arrived at with a request to create a package', () => {
      beforeEach(async () => {
        await renderSurface('?create=package');
      });

      it('opens the package creation drawer', () => {
        expect(screen.getByTestId('create-package-drawer')).toBeInTheDocument();
      });

      it('keeps the request in the address, so a reload keeps the drawer', () => {
        expect(search()).toBe('?create=package');
      });

      describe('when the drawer is cancelled', () => {
        beforeEach(async () => {
          await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        });

        it('closes the drawer', () => {
          expect(screen.queryByTestId('create-package-drawer')).toBeNull();
        });

        it('drops the request from the address', () => {
          expect(search()).toBe('');
        });
      });

      describe('when the package is created', () => {
        beforeEach(async () => {
          await userEvent.click(screen.getByRole('button', { name: 'Create' }));
        });

        it('opens the new package instead of the drawer', () => {
          expect(search()).toBe('?package=pkg-1');
        });
      });
    });

    describe('when New package is clicked in the rail', () => {
      it('writes the request to the address', async () => {
        await renderSurface('');

        await userEvent.click(
          screen.getByRole('button', { name: /New package/ }),
        );

        expect(search()).toBe('?create=package');
      });
    });
  });
});
