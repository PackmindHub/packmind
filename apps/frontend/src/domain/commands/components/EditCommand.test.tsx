import { render, screen, fireEvent, within } from '@testing-library/react';
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

jest.mock('../api/queries/CommandsQueries', () => ({
  ...jest.requireActual('../api/queries/CommandsQueries'),
  useUpdateCommandMutation: jest.fn(),
  useGetCommandsQuery: jest.fn(),
}));

jest.mock(
  '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries',
  () => ({
    ...jest.requireActual(
      '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries',
    ),
    useListChangeProposalsByCommandQuery: jest.fn(),
  }),
);

jest.mock('../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ organization: { id: 'org-1' } }),
}));

jest.mock('../../spaces/hooks/useCurrentSpace', () => ({
  useCurrentSpace: () => ({ spaceId: 'space-1' }),
}));

jest.mock('../../../shared/hooks/useNavigation', () => ({
  useNavigation: () => ({ space: { toCommand: jest.fn() } }),
}));

jest.mock('../../../shared/components/editor/MarkdownEditor', () => ({
  MarkdownEditorProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock('./CommandForm', () => ({
  CommandForm: ({
    onSubmit,
  }: {
    onSubmit: (data: CommandFormData) => void;
  }) => (
    <button
      onClick={() => onSubmit({ name: 'Release cli', content: 'Updated body' })}
    >
      Save command
    </button>
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
  jest
    .spyOn(ChangeProposalsQueriesModule, 'useListChangeProposalsByCommandQuery')
    .mockReturnValue({
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
  let updateMutate: jest.Mock;

  beforeEach(() => {
    updateMutate = jest.fn();

    jest
      .spyOn(CommandsQueriesModule, 'useUpdateCommandMutation')
      .mockReturnValue({
        mutate: updateMutate,
        isPending: false,
      } as unknown as ReturnType<
        typeof CommandsQueriesModule.useUpdateCommandMutation
      >);
    jest
      .spyOn(CommandsQueriesModule, 'useGetCommandsQuery')
      .mockReturnValue({ data: [] } as unknown as ReturnType<
        typeof CommandsQueriesModule.useGetCommandsQuery
      >);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderEditCommand = () =>
    render(
      <UIProvider>
        <EditCommand recipe={recipe} />
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
});
