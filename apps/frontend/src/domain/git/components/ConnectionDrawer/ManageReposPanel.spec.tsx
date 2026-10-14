import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { UIProvider } from '@packmind/ui';
import { createGitProviderId, createGitRepoId } from '@packmind/types';
import { ManageReposPanel } from './ManageReposPanel';
import { GitProviderUI } from '../../types/GitProviderTypes';
import { RepoSelection } from './types';

const trackedBranchProbe = vi.fn();
const checkBranchExists = vi.fn();
const searchBranches = vi.fn();
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
  useSearchProviderBranchesQuery: (...args: [unknown]) =>
    searchBranches(...args),
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

// The combobox reacts only to real user input, so text goes through userEvent.
// Pasted rather than typed: typing loses keystrokes when the combobox writes
// the value back, which only userEvent's simulated caret trips over.
const enterText = async (input: HTMLElement, text: string) => {
  await userEvent.click(input);
  await userEvent.paste(text);
};

const typeBranch = async (branch: string, key = 'Enter') => {
  fireEvent.click(screen.getByTestId('manage-repos-change-branch'));
  const input = screen.getByTestId('manage-repos-branch-input');
  await enterText(input, branch);
  fireEvent.keyDown(input, { key });
};

const branchSearchResult = (branches: string[]) => ({
  data: { branches },
  isLoading: false,
  isError: false,
});

const openBranchInput = () => {
  fireEvent.click(screen.getByTestId('manage-repos-change-branch'));
  return screen.getByTestId('manage-repos-branch-input') as HTMLInputElement;
};

const suggestedBranches = () =>
  screen
    .queryAllByTestId('manage-repos-branch-option')
    .map((option) => option.textContent);

const optionFor = (branch: string) =>
  screen
    .getAllByTestId('manage-repos-branch-option')
    .find((option) => option.textContent === branch) as HTMLElement;

const rowFor = (branch: string) =>
  screen
    .getAllByTestId('manage-repos-row')
    .find((row) => row.getAttribute('data-branch') === branch) as HTMLElement;

describe('ManageReposPanel', () => {
  beforeEach(() => {
    trackedBranchProbe.mockReturnValue({ data: true });
    searchBranches.mockReturnValue(branchSearchResult([]));
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
        await typeBranch('dev');
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
        await typeBranch('dev');
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
        await typeBranch('dev');
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
      beforeEach(async () => {
        await typeBranch(branch);
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

    describe('and the user presses Escape while no suggestions are shown', () => {
      beforeEach(() => {
        fireEvent.keyDown(openBranchInput(), { key: 'Escape' });
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

    describe('while the branch input is closed', () => {
      it('does not search branches', () => {
        expect(searchBranches).not.toHaveBeenCalled();
      });
    });

    describe('and the user types part of a branch name', () => {
      beforeEach(async () => {
        searchBranches.mockReturnValue(
          branchSearchResult(['dev', 'develop', 'main']),
        );
        await enterText(openBranchInput(), 'de');
        await screen.findAllByTestId('manage-repos-branch-option');
      });

      it('searches the repository branches with the typed text once typing pauses', async () => {
        await waitFor(() =>
          expect(searchBranches).toHaveBeenCalledWith({
            providerId: provider.id,
            owner: 'o',
            repo: 'r',
            search: 'de',
          }),
        );
      });

      it('suggests the matching branches except the current one', () => {
        expect(suggestedBranches()).toEqual(['dev', 'develop']);
      });

      it('emphasises the typed text in each suggestion', () => {
        expect(
          within(optionFor('develop')).getByTestId(
            'manage-repos-branch-option-match',
          ),
        ).toHaveTextContent(/^de$/);
      });

      it('shows the keyboard hints under the suggestions', () => {
        expect(
          screen.getByTestId('manage-repos-branch-hints'),
        ).toHaveTextContent('↑↓ navigate · ↵ switch · esc cancel');
      });

      describe('and picks a suggestion', () => {
        beforeEach(async () => {
          fireEvent.click(optionFor('develop'));
          await waitFor(() => expect(onSelectionChange).toHaveBeenCalled());
        });

        it('switches to the picked branch', () => {
          expect(onSelectionChange.mock.calls[0][0].tuples).toEqual([
            { owner: 'o', repo: 'r', branch: 'develop' },
          ]);
        });

        // The provider has just listed it: there is nothing left to verify.
        it('does not check the provider', () => {
          expect(checkBranchExists).not.toHaveBeenCalled();
        });

        it('closes the input', () => {
          expect(
            screen.queryByTestId('manage-repos-branch-input'),
          ).not.toBeInTheDocument();
        });

        it('tells the drawer the branch is no longer being edited', async () => {
          await waitFor(() => expect(lastEditingState()).toBe(false));
        });
      });

      describe('and highlights a suggestion and presses Enter', () => {
        beforeEach(async () => {
          await userEvent.keyboard('{ArrowDown}{Enter}');
          await waitFor(() => expect(onSelectionChange).toHaveBeenCalled());
        });

        it('switches to the highlighted branch', () => {
          expect(onSelectionChange.mock.calls[0][0].tuples).toEqual([
            { owner: 'o', repo: 'r', branch: 'dev' },
          ]);
        });

        it('does not check the provider', () => {
          expect(checkBranchExists).not.toHaveBeenCalled();
        });
      });

      describe('and presses Escape', () => {
        beforeEach(async () => {
          await userEvent.keyboard('{Escape}');
        });

        it('hides the suggestions', async () => {
          await waitFor(() => expect(suggestedBranches()).toEqual([]));
        });

        it('keeps the input open', () => {
          expect(
            screen.getByTestId('manage-repos-branch-input'),
          ).toBeInTheDocument();
        });

        it('still tells the drawer a branch is being edited', () => {
          expect(lastEditingState()).toBe(true);
        });

        describe('and presses Escape again', () => {
          beforeEach(async () => {
            await waitFor(() => expect(suggestedBranches()).toEqual([]));
            await userEvent.keyboard('{Escape}');
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
      });
    });

    describe('and no branch matches the typed text', () => {
      beforeEach(async () => {
        await enterText(openBranchInput(), 'zzz');
      });

      it('says no branch matches the typed text', async () => {
        expect(
          await screen.findByText('No branch matches “zzz”'),
        ).toBeInTheDocument();
      });
    });

    describe('while the branches are loading', () => {
      beforeEach(async () => {
        searchBranches.mockReturnValue({
          data: undefined,
          isLoading: true,
          isError: false,
        });
        await enterText(openBranchInput(), 'de');
      });

      it('says the branches are being searched', async () => {
        expect(await screen.findByText('Searching…')).toBeInTheDocument();
      });
    });

    describe('and the branch search fails', () => {
      beforeEach(async () => {
        searchBranches.mockReturnValue({
          data: undefined,
          isLoading: false,
          isError: true,
        });
        await enterText(openBranchInput(), 'de');
      });

      it('says the branches could not be loaded', () => {
        expect(
          screen.getByTestId('manage-repos-branch-search-error'),
        ).toHaveTextContent(
          "Couldn't load branches — you can still type a name",
        );
      });

      it('suggests no branch', () => {
        expect(suggestedBranches()).toEqual([]);
      });

      describe('and the user confirms the typed name', () => {
        beforeEach(async () => {
          checkBranchExists.mockResolvedValue({ exists: true });
          fireEvent.keyDown(screen.getByTestId('manage-repos-branch-input'), {
            key: 'Enter',
          });
          await waitFor(() => expect(onSelectionChange).toHaveBeenCalled());
        });

        it('checks the typed branch on the provider', () => {
          expect(checkBranchExists).toHaveBeenCalledWith(
            expect.objectContaining({ branch: 'de' }),
          );
        });
      });
    });

    describe('and no branch is typed yet', () => {
      beforeEach(() => {
        openBranchInput();
      });

      it('does not offer Enter to confirm', () => {
        expect(
          screen.queryByTestId('manage-repos-branch-enter-hint'),
        ).not.toBeInTheDocument();
      });
    });

    describe('and a branch name is typed', () => {
      beforeEach(async () => {
        await enterText(openBranchInput(), 'dev');
      });

      it('offers Enter to confirm', () => {
        expect(
          screen.getByTestId('manage-repos-branch-enter-hint'),
        ).toBeInTheDocument();
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

    describe('when the branch input is open', () => {
      beforeEach(() => {
        openBranchInput();
      });

      it('names the cancel button for assistive technologies', () => {
        expect(
          screen.getByTestId('manage-repos-branch-cancel'),
        ).toHaveAccessibleName('Cancel');
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

      it('shows the check in progress', () => {
        expect(
          screen.getByTestId('manage-repos-branch-checking'),
        ).toBeInTheDocument();
      });

      it('disables the cancel button', () => {
        expect(screen.getByTestId('manage-repos-branch-cancel')).toBeDisabled();
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
