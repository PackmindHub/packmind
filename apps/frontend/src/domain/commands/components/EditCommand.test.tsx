import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import {
  ChangeProposalStatus,
  Command,
  createCommandId,
  createSpaceId,
  createUserId,
} from '@packmind/types';

import * as CommandsQueriesModule from '../api/queries/CommandsQueries';
import * as ChangeProposalsQueriesModule from '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries';
import { EditCommand } from './EditCommand';
import { CommandFormData } from './CommandForm';
import type { Mock } from 'vitest';

vi.mock('../api/queries/CommandsQueries', async () => ({
  ...(await vi.importActual('../api/queries/CommandsQueries')),
  useUpdateCommandMutation: vi.fn(),
  useGetCommandsQuery: vi.fn(),
}));

vi.mock(
  '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries',
  async () => ({
    ...(await vi.importActual(
      '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries',
    )),
    useListChangeProposalsByCommandQuery: vi.fn(),
  }),
);

vi.mock('../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ organization: { id: 'org-1' } }),
}));

vi.mock('../../spaces/hooks/useCurrentSpace', () => ({
  useCurrentSpace: () => ({ spaceId: 'space-1' }),
}));

const nav = vi.hoisted(() => ({ to: vi.fn(), toCommand: vi.fn() }));

vi.mock('../../../shared/hooks/useNavigation', () => ({
  useNavigation: () => ({ to: nav.to, space: { toCommand: nav.toCommand } }),
}));

vi.mock('../../../shared/components/editor/MarkdownEditor', () => ({
  MarkdownEditorProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock('./CommandForm', () => ({
  CommandForm: ({
    onSubmit,
    onCancel,
  }: {
    onSubmit: (data: CommandFormData) => void;
    onCancel: () => void;
  }) => (
    <>
      <button
        onClick={() =>
          onSubmit({ name: 'Release cli', content: 'Updated body' })
        }
      >
        Save command
      </button>
      <button onClick={onCancel}>Cancel command</button>
    </>
  ),
}));

const recipe: Command = {
  id: createCommandId('command-1'),
  name: 'Release cli',
  slug: 'release-cli',
  content: 'Original body',
  version: 3,
  userId: createUserId('user-1'),
  spaceId: createSpaceId('space-1'),
  movedTo: null,
};

const mockPendingProposals = (pendingCount: number) => {
  vi.spyOn(
    ChangeProposalsQueriesModule,
    'useListChangeProposalsByCommandQuery',
  ).mockReturnValue({
    data: {
      changeProposals: Array.from({ length: pendingCount }, () => ({
        status: ChangeProposalStatus.pending,
      })),
    },
    isLoading: false,
    isError: false,
  } as ReturnType<
    typeof ChangeProposalsQueriesModule.useListChangeProposalsByCommandQuery
  >);
};

describe('EditCommand', () => {
  let updateMutate: Mock;

  beforeEach(() => {
    updateMutate = vi.fn();
    /*
     * Hoisted so the mock factory can close over them, which puts them outside
     * the reach of restoreAllMocks: cleared by hand or every assertion on them
     * also sees the previous test's navigation.
     */
    nav.to.mockClear();
    nav.toCommand.mockClear();

    vi.spyOn(CommandsQueriesModule, 'useUpdateCommandMutation').mockReturnValue(
      {
        mutate: updateMutate,
        isPending: false,
      } as unknown as ReturnType<
        typeof CommandsQueriesModule.useUpdateCommandMutation
      >,
    );
    vi.spyOn(CommandsQueriesModule, 'useGetCommandsQuery').mockReturnValue({
      data: [],
    } as unknown as ReturnType<
      typeof CommandsQueriesModule.useGetCommandsQuery
    >);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /*
   * Mounted under the real route pattern rather than bare, because the component
   * reads the space it is in from the path and the package it was opened from
   * from the query. Rendered outside a router it would only ever see neither.
   */
  const EDIT_ROUTE = '/org/:orgSlug/space/:spaceSlug/commands/:commandId/edit';
  const EDIT_ADDRESS = '/org/acme/space/core/commands/command-1/edit';

  const renderEditCommand = (address: string = EDIT_ADDRESS) =>
    render(
      <UIProvider>
        <MemoryRouter initialEntries={[address]}>
          <Routes>
            <Route
              path={EDIT_ROUTE}
              element={<EditCommand recipe={recipe} />}
            />
          </Routes>
        </MemoryRouter>
      </UIProvider>,
    );

  const submitForm = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Save command' }));
  };

  describe('when the command has pending change proposals', () => {
    beforeEach(() => {
      mockPendingProposals(1);
    });

    it('shows the pending change proposals warning', () => {
      renderEditCommand();

      expect(
        screen.getByText(
          '1 change proposal is pending on this command. Saving a new version will make it outdated.',
        ),
      ).toBeInTheDocument();
    });

    describe('when the user saves', () => {
      it('asks for confirmation instead of updating directly', async () => {
        renderEditCommand();

        submitForm();

        expect(
          await screen.findByText('Save with pending change proposals?'),
        ).toBeInTheDocument();
        expect(updateMutate).not.toHaveBeenCalled();
      });

      describe('when the user confirms', () => {
        it('updates the command with the submitted data', async () => {
          renderEditCommand();

          submitForm();
          fireEvent.click(
            await screen.findByRole('button', { name: 'Save anyway' }),
          );

          expect(updateMutate).toHaveBeenCalledWith(
            expect.objectContaining({
              id: recipe.id,
              updateData: { name: 'Release cli', content: 'Updated body' },
            }),
            expect.anything(),
          );
        });
      });

      describe('when the user cancels', () => {
        it('does not update the command', async () => {
          renderEditCommand();

          submitForm();
          const dialog = await screen.findByRole('dialog');
          fireEvent.click(
            within(dialog).getByRole('button', { name: 'Cancel' }),
          );

          expect(updateMutate).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('when the command has no pending change proposals', () => {
    beforeEach(() => {
      mockPendingProposals(0);
    });

    it('does not show the warning', () => {
      renderEditCommand();

      expect(
        screen.queryByText(/pending on this command/),
      ).not.toBeInTheDocument();
    });

    describe('when the user saves', () => {
      it('updates the command without confirmation', () => {
        renderEditCommand();

        submitForm();

        expect(
          screen.queryByText('Save with pending change proposals?'),
        ).not.toBeInTheDocument();
        expect(updateMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            id: recipe.id,
            updateData: { name: 'Release cli', content: 'Updated body' },
          }),
          expect.anything(),
        );
      });
    });
  });

  describe('when the user leaves the form', () => {
    beforeEach(() => {
      mockPendingProposals(0);
    });

    const cancelForm = () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel command' }));
    };

    describe('when a package opened the form', () => {
      it('goes back to that package, on the command', () => {
        renderEditCommand(`${EDIT_ADDRESS}?package=pkg-1`);

        cancelForm();

        expect(nav.to).toHaveBeenCalledWith(
          '/org/acme/space/core/context?package=pkg-1&component=command-1',
        );
        expect(nav.toCommand).not.toHaveBeenCalled();
      });
    });

    describe('when no package opened the form', () => {
      it("goes back to the command's own page", () => {
        renderEditCommand();

        cancelForm();

        expect(nav.toCommand).toHaveBeenCalledWith(recipe.id);
        expect(nav.to).not.toHaveBeenCalled();
      });
    });
  });
});
