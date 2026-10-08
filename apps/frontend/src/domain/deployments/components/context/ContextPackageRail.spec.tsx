import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { UIProvider } from '@packmind/ui';
import type {
  PackageId,
  PackageResponse,
  SpaceId,
  UserId,
} from '@packmind/types';
import { createPackageId } from '@packmind/types';
import type { SpaceCatalogue } from './buildPackageContext';
import type { PackageAttention } from './buildPackageAttention';
import { ContextPackageRail } from './ContextPackageRail';

const EMPTY_CATALOGUE: SpaceCatalogue = {
  standards: [],
  commands: [],
  skills: [],
};

function makePackage(name: string): PackageResponse {
  return {
    id: createPackageId(name),
    name,
    slug: name,
    description: '',
    spaceId: 'space-1' as SpaceId,
    createdBy: 'user-1' as UserId,
    recipes: [],
    commands: [],
    standards: [],
    skills: [],
  };
}

/*
 * Two of the three share a prefix, so a search can leave a proper subset of the
 * list behind rather than all of it or one of it.
 */
const ALPHA = makePackage('alpha');
const BRAVO = makePackage('bravo');
const ALPINE = makePackage('alpine');

async function renderRail({
  packages = [ALPHA, BRAVO, ALPINE],
  onDeletePackages = vi.fn().mockResolvedValue(undefined),
  attention = new Map<PackageId, PackageAttention>(),
}: {
  packages?: PackageResponse[];
  onDeletePackages?: (packageIds: readonly PackageId[]) => Promise<void>;
  attention?: ReadonlyMap<PackageId, PackageAttention>;
} = {}) {
  await act(async () => {
    render(
      <UIProvider>
        <MemoryRouter>
          <ContextPackageRail
            packages={packages}
            catalogue={EMPTY_CATALOGUE}
            orgSlug="acme"
            spaceSlug="core"
            selectedPackageId={null}
            attention={attention}
            isAttentionUnavailable={false}
            showingInventory={false}
            inventoryCount={0}
            orphanCount={0}
            showingOrphans={false}
            onSelect={vi.fn()}
            onShowInventory={vi.fn()}
            onShowOrphans={vi.fn()}
            onCreatePackage={vi.fn()}
            onDeletePackages={onDeletePackages}
          />
        </MemoryRouter>
      </UIProvider>,
    );
  });

  return onDeletePackages;
}

const pick = (name: string) =>
  userEvent.click(screen.getByRole('checkbox', { name: `Select ${name}` }));

/*
 * The bar's button and the confirmation's are both `Delete`, one inside the
 * dialog the other opens. Scoping the second is what keeps the two apart.
 */
const openConfirmation = () =>
  userEvent.click(screen.getByRole('button', { name: 'Delete' }));

const confirm = () =>
  userEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }),
  );

const selectionBarButton = () =>
  screen.queryByRole('button', { name: 'Delete' });

describe('ContextPackageRail', () => {
  /*
   * The bar is the whole difference between reading the rail and acting on it,
   * and reading is what it is for nine times out of ten.
   */
  describe('when nothing is picked', () => {
    it('offers no bulk action', async () => {
      await renderRail();

      expect(selectionBarButton()).toBeNull();
    });

    /*
     * The band under the list is the create button's until something is picked,
     * which is the arrangement the Distribution rail has.
     */
    it('keeps the create button in the band under the list', async () => {
      await renderRail();

      expect(screen.getByRole('button', { name: 'New package' })).toBeVisible();
    });
  });

  describe('when packages are picked', () => {
    it('counts them rather than listing them', async () => {
      await renderRail();

      await pick('alpha');
      await pick('alpine');

      expect(screen.getByText('2 selected')).toBeVisible();
    });

    /*
     * One band, one thing at a time: a rail offering a package to create to the
     * reader who is deleting three is a rail that grew a line for the nine
     * visits out of ten where nothing is picked.
     */
    it('gives the band under the list over to the selection', async () => {
      await renderRail();

      await pick('alpha');

      expect(screen.queryByRole('button', { name: 'New package' })).toBeNull();
    });

    it('asks before deleting anything', async () => {
      const onDeletePackages = await renderRail();

      await pick('alpha');
      await openConfirmation();

      expect(onDeletePackages).not.toHaveBeenCalled();
    });

    it('deletes the whole selection in one call once confirmed', async () => {
      const onDeletePackages = await renderRail();

      await pick('alpha');
      await pick('alpine');
      await openConfirmation();
      await confirm();

      expect(onDeletePackages).toHaveBeenCalledTimes(1);
      expect(onDeletePackages).toHaveBeenCalledWith([ALPHA.id, ALPINE.id]);
    });

    /*
     * A package is a set of memberships, so deleting one is not deleting what it
     * holds. That is the question the dialog exists to answer.
     */
    it('says what deleting a package does not delete', async () => {
      await renderRail();

      await pick('alpha');
      await openConfirmation();

      expect(screen.getByText(/stay in the space/)).toBeVisible();
    });

    describe('once the deletion goes through', () => {
      it('drops the selection with it', async () => {
        await renderRail();

        await pick('alpha');
        await openConfirmation();
        await confirm();

        /*
         * The readout rather than the button: the dialog that just closed had a
         * `Delete` of its own, and a query for the word cannot tell which of the
         * two it failed to find.
         */
        expect(screen.queryByText('1 selected')).toBeNull();
        expect(
          screen.getByRole('button', { name: 'New package' }),
        ).toBeVisible();
      });
    });

    /*
     * The dialog staying open is what says the packages are still there to try
     * again on.
     */
    describe('when the deletion fails', () => {
      it('keeps the confirmation open on what was picked', async () => {
        await renderRail({
          onDeletePackages: vi.fn().mockRejectedValue(new Error('nope')),
        });

        await pick('alpha');
        await openConfirmation();
        await confirm();

        expect(screen.getByRole('dialog')).toBeVisible();
      });
    });
  });

  /*
   * Everything the bar offers acts on the rows the filters left, so an offer to
   * pick beyond them would be an offer to act on rows the reader cannot see.
   */
  describe('picking everything at once', () => {
    it('takes only the rows the search left', async () => {
      const onDeletePackages = await renderRail();

      await userEvent.type(
        screen.getByRole('textbox', {
          name: 'Search packages and components',
        }),
        'alp',
      );
      await pick('alpha');
      await userEvent.click(
        screen.getByRole('checkbox', {
          name: 'Select every package the rail is showing',
        }),
      );
      await openConfirmation();
      await confirm();

      expect(onDeletePackages).toHaveBeenCalledWith([ALPHA.id, ALPINE.id]);
    });
  });
});
