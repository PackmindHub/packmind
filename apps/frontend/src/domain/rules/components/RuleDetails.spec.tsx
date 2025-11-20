import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
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

jest.mock('../api/queries', () => ({
  useGetRuleExamplesQuery: jest.fn(),
}));

jest.mock('../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: () => ({
    organization: {
      id: 'org-1',
      name: 'Org',
      slug: 'org-slug',
      role: 'ADMIN',
    },
  }),
}));

jest.mock('../../spaces/hooks/useCurrentSpace', () => ({
  useCurrentSpace: () => ({
    spaceId: 'space-1',
    spaceSlug: 'space-slug',
    spaceName: 'Space',
    isReady: true,
  }),
}));

jest.mock(
  '@packmind/proprietary/frontend/domain/detection/components/ProgramEditor',
  () => ({
    ProgramEditor: () => <div data-testid="program-editor" />,
  }),
);

jest.mock('./RuleExamplesManager', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  const RuleExamplesManagerMock = (props: {
    selectedLanguage: string;
    forceCreate?: boolean;
  }) => (
    <div data-testid="rule-examples-manager">
      <span data-testid="selected-language">{props.selectedLanguage}</span>
      <span data-testid="force-create">
        {props.forceCreate ? 'true' : 'false'}
      </span>
    </div>
  );

  return {
    __esModule: true,
    RuleExamplesManager: RuleExamplesManagerMock,
  };
});

const mockUseGetRuleExamplesQuery =
  useGetRuleExamplesQuery as jest.MockedFunction<
    typeof useGetRuleExamplesQuery
  >;

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<UIProvider>{ui}</UIProvider>);
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
    jest.clearAllMocks();
  });

  describe('when there are no rule examples', () => {
    it('renders empty state', () => {
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

      expect(screen.getByText('No code examples yet')).toBeInTheDocument();
      expect(
        screen.queryByTestId('rule-examples-manager'),
      ).not.toBeInTheDocument();
    });
  });

  it('displays configured languages group and add language group in selector', async () => {
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

    const languageLabel = screen.getByText('Language :');
    const languageContainer = languageLabel.closest('div');
    expect(languageContainer).not.toBeNull();

    const triggerCombobox = within(languageContainer as HTMLElement).getByRole(
      'combobox',
    );
    await user.click(triggerCombobox);

    await waitFor(() => {
      expect(screen.getByText('Configured Languages')).toBeInTheDocument();
    });
    expect(screen.getByText('Add a language')).toBeInTheDocument();
    expect(screen.getAllByText('JavaScript')[0]).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
  });

  describe('when selecting a language from the "Add a language" group', () => {
    it('enables example creation', async () => {
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

      // Initially, creation mode is not enabled
      expect(screen.getByTestId('force-create')).toHaveTextContent('false');

      const languageLabel = screen.getByText('Language :');
      const languageContainer = languageLabel.closest('div') as HTMLElement;
      const triggerCombobox = within(languageContainer).getByRole('combobox');
      await user.click(triggerCombobox);

      // Open "Add a language" group
      const addLanguageGroupLabel = screen.getByText('Add a language');
      await user.click(addLanguageGroupLabel);

      // Select a language that is not configured yet (e.g. Python)
      const pythonOption = await screen.findByText('Python');
      await user.click(pythonOption);

      await waitFor(() => {
        expect(screen.getByTestId('force-create')).toHaveTextContent('true');
      });
      expect(screen.getByTestId('selected-language')).toHaveTextContent(
        'PYTHON',
      );
    });
  });
});
