import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';
import { UIProvider } from '@packmind/ui';
import {
  ProgrammingLanguage,
  Rule,
  RuleExample,
  RuleId,
  StandardId,
  StandardVersionId,
} from '@packmind/types';
import { RuleDetails } from './RuleDetails';
import { useGetRuleExamplesQuery } from '../api/queries';
import type { MockedFunction } from 'vitest';

vi.mock('../api/queries', () => ({
  useGetRuleExamplesQuery: vi.fn(),
}));

vi.mock('../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: () => ({
    organization: {
      id: 'org-1',
      name: 'Org',
      slug: 'org-slug',
      role: 'ADMIN',
    },
  }),
}));

vi.mock('../../spaces/hooks/useCurrentSpace', () => ({
  useCurrentSpace: () => ({
    spaceId: 'space-1',
    spaceSlug: 'space-slug',
    spaceName: 'Space',
    isReady: true,
  }),
}));

vi.mock(
  '@packmind/proprietary/frontend/domain/detection/components/ProgramEditor',
  () => ({
    ProgramEditor: () => <div data-testid="program-editor" />,
  }),
);

vi.mock('./RuleExamplesManager', () => ({
  __esModule: true,
  RuleExamplesManager: (props: { selectedLanguage: string }) => (
    <div data-testid="rule-examples-manager">
      <span data-testid="selected-language">{props.selectedLanguage}</span>
    </div>
  ),
}));

const mockUseGetRuleExamplesQuery = useGetRuleExamplesQuery as MockedFunction<
  typeof useGetRuleExamplesQuery
>;

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <UIProvider>{ui}</UIProvider>
    </MemoryRouter>,
  );
};

const createRule = (): Rule => ({
  id: 'rule-1' as RuleId,
  content: 'Test rule content',
  standardVersionId: 'standard-version-1' as StandardVersionId,
});

const createRuleExample = (
  id: string,
  lang: ProgrammingLanguage,
): RuleExample => ({
  id: id as unknown as RuleExample['id'],
  lang,
  positive: 'positive example',
  negative: 'negative example',
  ruleId: 'rule-1' as RuleId,
});

describe('RuleDetails - language selector and states', () => {
  beforeEach(() => {
    mockUseGetRuleExamplesQuery.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('when there are no rule examples', () => {
    beforeEach(() => {
      mockUseGetRuleExamplesQuery.mockReturnValue({
        data: [],
        isLoading: false,
      } as unknown as ReturnType<typeof useGetRuleExamplesQuery>);

      renderWithProviders(
        <RuleDetails
          standardId={'standard-1' as StandardId}
          rule={createRule()}
        />,
      );
    });

    /*
      A rule with no examples has nothing to read, so the body it opens on is
      the one that writes them. Announcing the absence and then asking for a
      click put a door in front of an empty room.
    */
    it('opens straight onto the examples body', () => {
      expect(screen.getByTestId('rule-examples-manager')).toBeInTheDocument();
    });
  });

  describe('when opening the language selector with configured examples', () => {
    beforeEach(async () => {
      const examples: RuleExample[] = [
        createRuleExample('ex-1', ProgrammingLanguage.JAVASCRIPT),
        createRuleExample('ex-2', ProgrammingLanguage.PYTHON),
      ];

      mockUseGetRuleExamplesQuery.mockReturnValue({
        data: examples,
        isLoading: false,
      } as unknown as ReturnType<typeof useGetRuleExamplesQuery>);

      const user = userEvent.setup({ pointerEventsCheck: 0 });

      renderWithProviders(
        <RuleDetails
          standardId={'standard-1' as StandardId}
          rule={createRule()}
        />,
      );

      const languageLabel = screen.getByText('Language');
      const languageContainer = languageLabel.closest('div') as HTMLElement;
      const triggerCombobox = within(languageContainer).getByRole('combobox');
      await user.click(triggerCombobox);

      await waitFor(() => {
        expect(screen.getByText('Configured Languages')).toBeInTheDocument();
      });
    });

    it('displays the configured languages group', async () => {
      expect(screen.getByText('Configured Languages')).toBeInTheDocument();
    });

    it('displays the add language group', async () => {
      expect(screen.getByText('Add a language')).toBeInTheDocument();
    });

    it('displays JavaScript in the configured languages', async () => {
      expect(screen.getAllByText('JavaScript')[0]).toBeInTheDocument();
    });

    it('displays Python in the configured languages', async () => {
      expect(screen.getByText('Python')).toBeInTheDocument();
    });
  });

  describe('when selecting a language from the "Add a language" group', () => {
    beforeEach(async () => {
      const examples: RuleExample[] = [
        createRuleExample('ex-1', ProgrammingLanguage.JAVASCRIPT),
      ];

      mockUseGetRuleExamplesQuery.mockReturnValue({
        data: examples,
        isLoading: false,
      } as unknown as ReturnType<typeof useGetRuleExamplesQuery>);

      const user = userEvent.setup({ pointerEventsCheck: 0 });

      renderWithProviders(
        <RuleDetails
          standardId={'standard-1' as StandardId}
          rule={createRule()}
        />,
      );

      const languageLabel = screen.getByText('Language');
      const languageContainer = languageLabel.closest('div') as HTMLElement;
      const triggerCombobox = within(languageContainer).getByRole('combobox');
      await user.click(triggerCombobox);

      const addLanguageGroupLabel = screen.getByText('Add a language');
      await user.click(addLanguageGroupLabel);

      const pythonOption = await screen.findByText('Python');
      await user.click(pythonOption);

      await waitFor(() => {
        expect(screen.getByTestId('selected-language')).toHaveTextContent(
          'PYTHON',
        );
      });
    });

    it('sets the selected language to PYTHON', async () => {
      expect(screen.getByTestId('selected-language')).toHaveTextContent(
        'PYTHON',
      );
    });
  });
});
