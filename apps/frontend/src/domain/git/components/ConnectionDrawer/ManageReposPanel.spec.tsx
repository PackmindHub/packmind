import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { createGitProviderId, createGitRepoId } from '@packmind/types';
import { ManageReposPanel } from './ManageReposPanel';
import { GitProviderUI } from '../../types/GitProviderTypes';
import { RepoSelection } from './types';

const trackedBranchProbe = vi.fn();
const checkBranchExists = vi.fn();
let checkBranchPending = false;

type SavedRowFixture = {
  id: ReturnType<typeof createGitRepoId>;
  owner: string;
  repo: string;
  branch: string;
  isTracked?: boolean;
  providerId: ReturnType<typeof createGitProviderId>;
};

const defaultSavedRows: SavedRowFixture[] = [
  {
    id: createGitRepoId('repo-1'),
    owner: 'my-orga',
    repo: 'my-repo',
    branch: 'feature/login',
    providerId: createGitProviderId('provider-1'),
  },
];
let savedRows: SavedRowFixture[] = defaultSavedRows;

vi.mock('../../api/queries', () => ({
  useGetRepositoriesByProviderQuery: () => ({
    data: savedRows,
    isLoading: false,
    isError: false,
  }),
  useGetAvailableRepositoriesQuery: () => ({
    data: {
      repositories: [
        {
          owner: 'my-orga',
          name: 'my-repo',
          fullName: 'my-orga/my-repo',
          defaultBranch: 'main',
        },
        {
          owner: 'o',
          name: 'r',
          fullName: 'o/r',
          defaultBranch: 'main',
        },
      ],
    },
    isLoading: false,
    isError: false,
    hasNextPage: false,
  }),
  useCheckTrackedBranchExistsQuery: (...args: [unknown]) =>
    trackedBranchProbe(...args),
  useCheckProviderBranchExistsMutation: () => ({
    mutateAsync: checkBranchExists,
    isPending: checkBranchPending,
  }),
}));

const provider = {
  id: createGitProviderId('provider-1'),
  source: 'github',
  url: 'https://github.com',
} as unknown as GitProviderUI;

const renderPanel = () =>
  render(
    <UIProvider>
      <ManageReposPanel
        provider={provider}
        selection={{
          tuples: [
            { owner: 'my-orga', repo: 'my-repo', branch: 'feature/login' },
            { owner: 'my-orga', repo: 'my-repo', branch: 'not-saved-yet' },
          ],
          switches: new Map(),
        }}
        onSelectionChange={vi.fn()}
        progress={null}
        onRequestReauth={vi.fn()}
      />
    </UIProvider>,
  );

const savedRow = (
  id: string,
  branch: string,
  isTracked: boolean,
): SavedRowFixture => ({
  id: createGitRepoId(id),
  owner: 'o',
  repo: 'r',
  branch,
  isTracked,
  providerId: createGitProviderId('provider-1'),
});

const onEditingBranchChange = vi.fn();

const renderPanelWith = (selection: RepoSelection) => {
  const onSelectionChange = vi.fn();
  render(
    <UIProvider>
      <ManageReposPanel
        provider={provider}
        selection={selection}
        onSelectionChange={onSelectionChange}
        progress={null}
        onRequestReauth={vi.fn()}
        onEditingBranchChange={onEditingBranchChange}
      />
    </UIProvider>,
  );
  return onSelectionChange;
};

const lastEditingState = () => onEditingBranchChange.mock.lastCall?.[0];

const selectionOf = (...branches: string[]): RepoSelection => ({
  tuples: branches.map((branch) => ({ owner: 'o', repo: 'r', branch })),
  switches: new Map(),
});

const typeBranch = (branch: string, key = 'Enter') => {
  fireEvent.click(screen.getByTestId('manage-repos-change-branch'));
  const input = screen.getByTestId('manage-repos-branch-input');
  fireEvent.change(input, { target: { value: branch } });
  fireEvent.keyDown(input, { key });
};

const rowFor = (branch: string) =>
  screen
    .getAllByTestId('manage-repos-row')
    .find((row) => row.getAttribute('data-branch') === branch) as HTMLElement;

describe('ManageReposPanel', () => {
  beforeEach(() => {
    trackedBranchProbe.mockReturnValue({ data: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
    savedRows = defaultSavedRows;
    checkBranchPending = false;
  });

  describe('when a repository is tracked on a branch', () => {
    beforeEach(() => {
      savedRows = [
        savedRow('row-main', 'main', true),
        savedRow('row-old', 'old', false),
      ];
      renderPanelWith(selectionOf('main', 'old'));
    });

    it('shows only the tracked branch', () => {
      const rows = within(
        screen.getByTestId('manage-repos-group'),
      ).getAllByTestId('manage-repos-row');

      expect(rows.map((row) => row.getAttribute('data-branch'))).toEqual([
        'main',
      ]);
    });
  });

  describe('when a legacy repository has several branches and none is tracked', () => {
    beforeEach(() => {
      savedRows = [
        savedRow('row-main', 'main', false),
        savedRow('row-feature', 'feature', false),
      ];
      renderPanelWith(selectionOf('main', 'feature'));
    });

    it('shows every branch', () => {
      expect(
        within(screen.getByTestId('manage-repos-group')).getAllByTestId(
          'manage-repos-row',
        ),
      ).toHaveLength(2);
    });
  });

  describe('when opening "change branch" on a repository not on its default branch', () => {
    beforeEach(() => {
      savedRows = [savedRow('row-feature', 'feature', true)];
      renderPanelWith(selectionOf('feature'));
      fireEvent.click(screen.getByTestId('manage-repos-change-branch'));
    });

    it('starts the input empty', () => {
      expect(screen.getByTestId('manage-repos-branch-input')).toHaveValue('');
    });

    it('offers the default branch as the placeholder', () => {
      expect(screen.getByTestId('manage-repos-branch-input')).toHaveAttribute(
        'placeholder',
        'main',
      );
    });

    describe('and Enter is pressed right away', () => {
      beforeEach(() => {
        fireEvent.keyDown(screen.getByTestId('manage-repos-branch-input'), {
          key: 'Enter',
        });
      });

      it('does not check the provider', () => {
        expect(checkBranchExists).not.toHaveBeenCalled();
      });

      it('closes the input', () => {
        expect(
          screen.queryByTestId('manage-repos-branch-input'),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('when changing the branch of a tracked repository', () => {
    let onSelectionChange: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      savedRows = [savedRow('row-main', 'main', true)];
      onSelectionChange = renderPanelWith(selectionOf('main'));
    });

    it('labels the button "change branch"', () => {
      expect(
        screen.getByTestId('manage-repos-change-branch'),
      ).toHaveTextContent('change branch');
    });

    describe('and the branch exists on the provider', () => {
      beforeEach(async () => {
        checkBranchExists.mockResolvedValue({ exists: true });
        typeBranch('dev');
        await waitFor(() => expect(onSelectionChange).toHaveBeenCalled());
      });

      it('checks the branch on the provider', () => {
        expect(checkBranchExists).toHaveBeenCalledWith({
          providerId: provider.id,
          owner: 'o',
          repo: 'r',
          branch: 'dev',
        });
      });

      it('replaces the branch instead of adding one', () => {
        expect(onSelectionChange.mock.calls[0][0].tuples).toEqual([
          { owner: 'o', repo: 'r', branch: 'dev' },
        ]);
      });

      it('records the switch for the repository', () => {
        expect(onSelectionChange.mock.calls[0][0].switches).toEqual(
          new Map([['o/r', 'dev']]),
        );
      });

      it('closes the input', () => {
        expect(
          screen.queryByTestId('manage-repos-branch-input'),
        ).not.toBeInTheDocument();
      });
    });

    describe('and the branch does not exist on the provider', () => {
      beforeEach(async () => {
        checkBranchExists.mockResolvedValue({ exists: false });
        typeBranch('dev');
        await screen.findByTestId('manage-repos-branch-error');
      });

      it('does not change the selection', () => {
        expect(onSelectionChange).not.toHaveBeenCalled();
      });

      it('keeps the input open', () => {
        expect(
          screen.getByTestId('manage-repos-branch-input'),
        ).toBeInTheDocument();
      });

      it('says the branch was not found', () => {
        expect(
          screen.getByTestId('manage-repos-branch-error'),
        ).toHaveTextContent('Branch dev not found in o/r');
      });

      it('marks the input invalid and describes it with the error', () => {
        const input = screen.getByTestId('manage-repos-branch-input');
        const error = screen.getByTestId('manage-repos-branch-error');

        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(input).toHaveAttribute('aria-describedby', error.id);
      });
    });

    describe('and the provider cannot be reached', () => {
      beforeEach(async () => {
        checkBranchExists.mockRejectedValue(new Error('boom'));
        typeBranch('dev');
        await screen.findByTestId('manage-repos-branch-error');
      });

      it('does not change the selection', () => {
        expect(onSelectionChange).not.toHaveBeenCalled();
      });

      it('asks to try again', () => {
        expect(
          screen.getByTestId('manage-repos-branch-error'),
        ).toHaveTextContent("Couldn't verify branch dev. Try again.");
      });
    });

    describe.each([
      ['the current branch', 'main'],
      ['an empty branch', '   '],
    ])('and the user enters %s', (_label, branch) => {
      beforeEach(() => {
        typeBranch(branch);
      });

      it('does not check the provider', () => {
        expect(checkBranchExists).not.toHaveBeenCalled();
      });

      it('closes the input', () => {
        expect(
          screen.queryByTestId('manage-repos-branch-input'),
        ).not.toBeInTheDocument();
      });
    });

    describe('when the branch input opens', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByTestId('manage-repos-change-branch'));
      });

      // The drawer would otherwise take the same Escape and close itself.
      it('tells the drawer a branch is being edited', () => {
        expect(lastEditingState()).toBe(true);
      });
    });

    describe('and the user presses Escape', () => {
      beforeEach(() => {
        typeBranch('dev', 'Escape');
      });

      it('tells the drawer the branch is no longer being edited', () => {
        expect(lastEditingState()).toBe(false);
      });

      it('does not check the provider', () => {
        expect(checkBranchExists).not.toHaveBeenCalled();
      });

      it('closes the input', () => {
        expect(
          screen.queryByTestId('manage-repos-branch-input'),
        ).not.toBeInTheDocument();
      });
    });

    describe('and the user clicks Change instead of pressing Enter', () => {
      beforeEach(async () => {
        checkBranchExists.mockResolvedValue({ exists: true });
        fireEvent.click(screen.getByTestId('manage-repos-change-branch'));
        fireEvent.change(screen.getByTestId('manage-repos-branch-input'), {
          target: { value: 'dev' },
        });
        fireEvent.click(screen.getByTestId('manage-repos-branch-confirm'));
        await waitFor(() => expect(onSelectionChange).toHaveBeenCalled());
      });

      it('replaces the branch', () => {
        expect(onSelectionChange.mock.calls[0][0].tuples).toEqual([
          { owner: 'o', repo: 'r', branch: 'dev' },
        ]);
      });
    });

    describe('and no branch is typed yet', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByTestId('manage-repos-change-branch'));
      });

      it('disables the Change button', () => {
        expect(
          screen.getByTestId('manage-repos-branch-confirm'),
        ).toBeDisabled();
      });
    });

    describe('and the user clicks Cancel', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByTestId('manage-repos-change-branch'));
        fireEvent.click(screen.getByTestId('manage-repos-branch-cancel'));
      });

      it('closes the input', () => {
        expect(
          screen.queryByTestId('manage-repos-branch-input'),
        ).not.toBeInTheDocument();
      });

      it('tells the drawer the branch is no longer being edited', () => {
        expect(lastEditingState()).toBe(false);
      });
    });

    describe('while the branch is being checked', () => {
      beforeEach(() => {
        checkBranchPending = true;
        fireEvent.click(screen.getByTestId('manage-repos-change-branch'));
      });

      it('disables the input', () => {
        expect(screen.getByTestId('manage-repos-branch-input')).toBeDisabled();
      });

      it('disables the Change button', () => {
        expect(
          screen.getByTestId('manage-repos-branch-confirm'),
        ).toBeDisabled();
      });
    });
  });

  describe('when a tracked branch no longer exists on the provider', () => {
    beforeEach(() => {
      trackedBranchProbe.mockReturnValue({ data: false });
      renderPanel();
    });

    it('marks that branch as deleted', () => {
      expect(
        within(rowFor('feature/login')).getByTestId('deleted-branch-badge'),
      ).toBeInTheDocument();
    });
  });

  describe('when the tracked branches still exist', () => {
    beforeEach(() => {
      trackedBranchProbe.mockReturnValue({ data: true });
      renderPanel();
    });

    it('marks no branch as deleted', () => {
      expect(
        screen.queryByTestId('deleted-branch-badge'),
      ).not.toBeInTheDocument();
    });
  });

  // Nothing is tracked for a branch the user has only just ticked, so there is
  // no repository to probe and nothing to accuse.
  describe('when a branch was added in the drawer but not saved', () => {
    beforeEach(() => {
      trackedBranchProbe.mockReturnValue({ data: undefined });
      renderPanel();
    });

    it('probes without a repository id', () => {
      expect(trackedBranchProbe).toHaveBeenCalledWith(undefined);
    });
  });
});
