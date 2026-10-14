import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { UIProvider } from '@packmind/ui';
import { createGitProviderId } from '@packmind/types';
import { RepositorySelector } from '../RepositorySelector';
import { GitProviderUI } from '../../../types/GitProviderTypes';

const addRepository = vi.fn();
const searchBranches = vi.fn();

vi.mock('../../../api/queries', () => ({
  useGetAvailableRepositoriesQuery: () => ({
    data: {
      repositories: [
        {
          owner: 'o',
          name: 'r',
          fullName: 'o/r',
          defaultBranch: 'main',
          private: false,
          stars: 0,
        },
      ],
    },
    isLoading: false,
    isError: false,
  }),
  useAddRepositoryMutation: () => ({
    mutate: addRepository,
    isPending: false,
    isError: false,
  }),
  useSearchProviderBranchesQuery: (...args: [unknown]) =>
    searchBranches(...args),
}));

const provider = {
  id: createGitProviderId('provider-1'),
  source: 'github',
  url: 'https://github.com',
} as unknown as GitProviderUI;

const branchInput = () =>
  screen.getByTestId('repository-selector-branch-input');

const suggestedBranches = () =>
  screen
    .queryAllByTestId('repository-selector-branch-option')
    .map((option) => option.textContent);

const addedBranch = () => addRepository.mock.lastCall?.[0].data.branch;

// Pasted rather than typed: the combobox writing the value back makes
// userEvent's simulated caret lose keystrokes.
const enterText = async (text: string) => {
  await userEvent.click(branchInput());
  await userEvent.paste(text);
};

describe('RepositorySelector', () => {
  beforeEach(() => {
    searchBranches.mockReturnValue({
      data: { branches: ['dev', 'develop', 'main'] },
      isLoading: false,
      isError: false,
    });
    render(
      <UIProvider>
        <RepositorySelector provider={provider} />
      </UIProvider>,
    );
    fireEvent.click(screen.getByText('r'));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('while the default branch is chosen', () => {
    it('does not search branches', () => {
      expect(searchBranches).not.toHaveBeenCalled();
    });
  });

  describe('when the user picks a custom branch', () => {
    beforeEach(() => {
      fireEvent.click(screen.getByLabelText('Use custom branch'));
    });

    describe('and types part of a branch name', () => {
      beforeEach(async () => {
        await enterText('de');
        await screen.findAllByTestId('repository-selector-branch-option');
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

      it('suggests the matching branches', () => {
        expect(suggestedBranches()).toEqual(['dev', 'develop', 'main']);
      });

      describe('then picks a suggestion and adds the repository', () => {
        beforeEach(async () => {
          fireEvent.click(
            screen
              .getAllByTestId('repository-selector-branch-option')
              .find(
                (option) => option.textContent === 'develop',
              ) as HTMLElement,
          );
          await waitFor(() =>
            expect(
              screen.getByRole('button', { name: 'Add repository' }),
            ).toBeEnabled(),
          );
          fireEvent.click(
            screen.getByRole('button', { name: 'Add repository' }),
          );
        });

        it('adds the repository on the picked branch', () => {
          expect(addedBranch()).toBe('develop');
        });
      });
    });

    describe('and confirms a typed name with Enter', () => {
      beforeEach(async () => {
        await enterText('release/1.0');
        await userEvent.keyboard('{Escape}');
        fireEvent.keyDown(branchInput(), { key: 'Enter' });
      });

      it('adds the repository on the typed branch', () => {
        expect(addedBranch()).toBe('release/1.0');
      });
    });

    describe('and cancels the branch input', () => {
      beforeEach(() => {
        fireEvent.click(
          screen.getByTestId('repository-selector-branch-cancel'),
        );
      });

      it('goes back to the default branch', () => {
        expect(screen.getByLabelText(/Use default branch/)).toBeChecked();
      });
    });
  });
});
