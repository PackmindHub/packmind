import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';
import { UIProvider } from '@packmind/ui';
import type { Mock } from 'vitest';
import {
  createOrganizationId,
  createSkillId,
  createSpaceId,
  createStandardId,
} from '@packmind/types';
import type { Skill, Standard } from '@packmind/types';

import { SpaceInventoryPane } from './SpaceInventoryPane';
import { useDeleteContextComponents } from './useDeleteContextComponents';

vi.mock('./useDeleteContextComponents', () => ({
  useDeleteContextComponents: vi.fn(),
}));

/* The list badges its rows off this; no test below reads the badge. */
vi.mock(
  '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries',
  () => ({
    useGetGroupedChangeProposalsQuery: () => ({ data: undefined }),
  }),
);

vi.mock('./MoveComponentDrawer', () => ({
  MoveComponentDrawer: () => <div data-testid="move-drawer" />,
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

async function renderInventory(
  deleteComponents = vi.fn().mockResolvedValue({ deleted: [], failed: [] }),
) {
  (useDeleteContextComponents as Mock).mockReturnValue({
    deleteComponents,
    isDeleting: false,
  });

  await act(async () => {
    render(
      <UIProvider>
        <MemoryRouter>
          <SpaceInventoryPane
            packages={[]}
            catalogue={{
              standards: [STANDARD],
              commands: [],
              skills: [SKILL],
            }}
            coverage="all"
            onCoverageChange={vi.fn()}
            spaceId={spaceId}
            organizationId={organizationId}
            orgSlug="acme"
            spaceSlug="backend"
            onCreatePackage={vi.fn()}
          />
        </MemoryRouter>
      </UIProvider>,
    );
  });

  return deleteComponents;
}

async function pickBoth() {
  await userEvent.click(
    screen.getByRole('checkbox', { name: 'Select Naming' }),
  );
  await userEvent.click(
    screen.getByRole('checkbox', { name: 'Select Onboarding' }),
  );
}

const openSelectionMenu = () =>
  userEvent.click(
    screen.getByRole('button', { name: 'More actions for the selection' }),
  );

/*
 * The one list in the plugin-first navigation that reaches a component no
 * package carries. Before this it could only give them one: a component nothing
 * distributed and nobody wanted had no way out of the space at all.
 */
describe('SpaceInventoryPane', () => {
  describe('deleting a selection', () => {
    it('keeps the deletion off the bar, behind the menu', async () => {
      await renderInventory();
      await pickBoth();

      expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
      expect(
        screen.getByRole('button', { name: 'Add to a package' }),
      ).toBeVisible();
    });

    it('asks before deleting anything', async () => {
      const deleteComponents = await renderInventory();
      await pickBoth();

      await openSelectionMenu();
      await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));

      expect(deleteComponents).not.toHaveBeenCalled();
    });

    it('deletes the whole selection in one call once confirmed', async () => {
      const deleteComponents = await renderInventory(
        vi.fn().mockResolvedValue({ deleted: [], failed: [] }),
      );
      await pickBoth();

      await openSelectionMenu();
      await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
      await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

      expect(deleteComponents).toHaveBeenCalledTimes(1);
      expect(deleteComponents.mock.calls[0][0]).toEqual([
        expect.objectContaining({ type: 'standard', key: 'std-1' }),
        expect.objectContaining({ type: 'skill', key: 'skill-1' }),
      ]);
    });

    /*
     * No package is named: a component read here is in any number of them, and
     * the whole point of the list is that the number can be zero.
     */
    it('says the components leave the space, naming no package', async () => {
      await renderInventory();
      await pickBoth();

      await openSelectionMenu();
      await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));

      expect(screen.getByText(/2 components/)).toBeVisible();
      expect(screen.queryByText(/this package/)).toBeNull();
    });
  });

  /*
   * The rows here belong to no package, so they have neither a move nor a
   * removal. Until deletion arrived they carried no menu at all.
   */
  describe('deleting one row from its own menu', () => {
    it('deletes that one alone', async () => {
      const deleteComponents = await renderInventory();

      await userEvent.click(
        screen.getByRole('button', { name: 'More actions for Naming' }),
      );
      await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
      await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

      expect(deleteComponents.mock.calls[0][0]).toEqual([
        expect.objectContaining({ type: 'standard', key: 'std-1' }),
      ]);
    });

    it('offers no gesture that needs a package', async () => {
      await renderInventory();

      await userEvent.click(
        screen.getByRole('button', { name: 'More actions for Naming' }),
      );

      expect(
        screen.queryByRole('menuitem', { name: 'Move to another package' }),
      ).toBeNull();
      expect(
        screen.queryByRole('menuitem', { name: 'Remove from package' }),
      ).toBeNull();
    });
  });

  describe('when part of the selection could not be deleted', () => {
    it('keeps the confirmation open on what is left', async () => {
      await renderInventory(
        vi.fn().mockResolvedValue({
          deleted: [{ type: 'standard', key: 'std-1', name: 'Naming' }],
          failed: [{ type: 'skill', key: 'skill-1', name: 'Onboarding' }],
        }),
      );
      await pickBoth();

      await openSelectionMenu();
      await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
      await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

      expect(screen.getByRole('button', { name: 'Delete' })).toBeVisible();
    });
  });

  describe('when everything picked is deleted', () => {
    it('closes the confirmation', async () => {
      await renderInventory();
      await pickBoth();

      await openSelectionMenu();
      await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
      await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

      expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    });
  });
});
