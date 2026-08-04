import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import {
  ChangeProposalStatus,
  createSpaceId,
  createStandardId,
  createUserId,
  Standard,
} from '@packmind/types';

import * as StandardsQueriesModule from '../api/queries/StandardsQueries';
import * as ChangeProposalsQueriesModule from '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries';
import { StandardForm } from './StandardForm';

vi.mock('../api/queries/StandardsQueries', async () => ({
  ...(await vi.importActual('../api/queries/StandardsQueries')),
  useCreateStandardMutation: vi.fn(),
  useUpdateStandardMutation: vi.fn(),
  useGetRulesByStandardIdQuery: vi.fn(),
  useGetStandardsQuery: vi.fn(),
}));

vi.mock(
  '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries',
  async () => ({
    ...(await vi.importActual(
      '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries',
    )),
    useListChangeProposalsByStandardQuery: vi.fn(),
  }),
);

vi.mock('../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ organization: { id: 'org-1' } }),
}));

vi.mock('../../spaces/hooks/useCurrentSpace', () => ({
  useCurrentSpace: () => ({ spaceId: 'space-1' }),
}));

vi.mock('../../../shared/components/editor/MarkdownEditor', () => ({
  MarkdownEditor: ({
    defaultValue,
    onMarkdownChange,
  }: {
    defaultValue?: string;
    onMarkdownChange?: (value: string) => void;
  }) => (
    <textarea
      data-testid="markdown-editor"
      defaultValue={defaultValue}
      onChange={(e) => onMarkdownChange?.(e.target.value)}
    />
  ),
}));

const standard: Standard = {
  id: createStandardId('standard-1'),
  name: 'My standard',
  slug: 'my-standard',
  description: 'A description',
  version: 2,
  userId: createUserId('user-1'),
  scope: null,
  spaceId: createSpaceId('space-1'),
  movedTo: null,
};

const mockPendingProposals = (pendingCount: number) => {
  vi.spyOn(
    ChangeProposalsQueriesModule,
    'useListChangeProposalsByStandardQuery',
  ).mockReturnValue({
    data: {
      changeProposals: Array.from({ length: pendingCount }, () => ({
        status: ChangeProposalStatus.pending,
      })),
    },
    isLoading: false,
    isError: false,
  } as ReturnType<
    typeof ChangeProposalsQueriesModule.useListChangeProposalsByStandardQuery
  >);
};

describe('StandardForm', () => {
  let updateMutate: jest.Mock;

  beforeEach(() => {
    updateMutate = vi.fn();

    vi.spyOn(
      StandardsQueriesModule,
      'useCreateStandardMutation',
    ).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<
      typeof StandardsQueriesModule.useCreateStandardMutation
    >);
    vi.spyOn(
      StandardsQueriesModule,
      'useUpdateStandardMutation',
    ).mockReturnValue({
      mutate: updateMutate,
      isPending: false,
    } as unknown as ReturnType<
      typeof StandardsQueriesModule.useUpdateStandardMutation
    >);
    vi.spyOn(
      StandardsQueriesModule,
      'useGetRulesByStandardIdQuery',
    ).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<
      typeof StandardsQueriesModule.useGetRulesByStandardIdQuery
    >);
    vi.spyOn(StandardsQueriesModule, 'useGetStandardsQuery').mockReturnValue({
      data: { standards: [] },
    } as unknown as ReturnType<
      typeof StandardsQueriesModule.useGetStandardsQuery
    >);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderEditForm = () =>
    render(
      <UIProvider>
        <StandardForm mode="edit" standard={standard} />
      </UIProvider>,
    );

  const submitForm = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Update Standard' }));
  };

  describe('when the standard has pending change proposals', () => {
    beforeEach(() => {
      mockPendingProposals(2);
    });

    it('shows the pending change proposals warning', () => {
      renderEditForm();

      expect(
        screen.getByText(
          '2 change proposals are pending on this standard. Saving a new version will make them outdated.',
        ),
      ).toBeInTheDocument();
    });

    describe('when the user saves', () => {
      it('asks for confirmation instead of updating directly', async () => {
        renderEditForm();

        submitForm();

        expect(
          await screen.findByText('Save with pending change proposals?'),
        ).toBeInTheDocument();
        expect(updateMutate).not.toHaveBeenCalled();
      });

      describe('when the user confirms', () => {
        it('updates the standard', async () => {
          renderEditForm();

          submitForm();
          fireEvent.click(
            await screen.findByRole('button', { name: 'Save anyway' }),
          );

          expect(updateMutate).toHaveBeenCalledWith(
            expect.objectContaining({ id: standard.id }),
            expect.anything(),
          );
        });
      });

      describe('when the user cancels', () => {
        it('does not update the standard', async () => {
          renderEditForm();

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

  describe('when the standard has no pending change proposals', () => {
    beforeEach(() => {
      mockPendingProposals(0);
    });

    it('does not show the warning', () => {
      renderEditForm();

      expect(
        screen.queryByText(/pending on this standard/),
      ).not.toBeInTheDocument();
    });

    describe('when the user saves', () => {
      it('updates the standard without confirmation', () => {
        renderEditForm();

        submitForm();

        expect(
          screen.queryByText('Save with pending change proposals?'),
        ).not.toBeInTheDocument();
        expect(updateMutate).toHaveBeenCalledWith(
          expect.objectContaining({ id: standard.id }),
          expect.anything(),
        );
      });
    });
  });

  describe('in create mode', () => {
    it('does not show the warning even if the query returns proposals', () => {
      mockPendingProposals(2);

      render(
        <UIProvider>
          <StandardForm mode="create" />
        </UIProvider>,
      );

      expect(
        screen.queryByText(/pending on this standard/),
      ).not.toBeInTheDocument();
    });
  });
});
