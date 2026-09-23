import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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

  describe('when the rule has examples in several languages', () => {
    beforeEach(async () => {
      const examples: RuleExample[] = [
        createRuleExample('ex-1', ProgrammingLanguage.JAVASCRIPT),
        createRuleExample('ex-2', ProgrammingLanguage.PYTHON),
      ];

      mockUseGetRuleExamplesQuery.mockReturnValue({
        data: examples,
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
      How many languages a rule speaks is the first fact about it, since each
      one gets its own detection program. A closed select spent that fact on a
      click.
    */
    it('names every language it speaks without being opened', () => {
      expect(
        screen.getByRole('button', { name: /^JavaScript/ }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /^Python/ }),
      ).toBeInTheDocument();
    });

    it('marks the one being read', () => {
      expect(
        screen.getByRole('button', { name: /^JavaScript/ }),
      ).toHaveAttribute('aria-pressed', 'true');
    });

    it('says how many examples each language carries', () => {
      expect(
        screen.getByRole('button', { name: /^JavaScript, 1 saved/ }),
      ).toBeInTheDocument();
    });
  });

  describe('when a language the rule does not speak yet is picked', () => {
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

      await user.click(screen.getByRole('button', { name: 'Add a language' }));
      await user.click(await screen.findByText('Python'));
    });

    it('opens the examples body on it', async () => {
      await waitFor(() => {
        expect(screen.getByTestId('selected-language')).toHaveTextContent(
          'PYTHON',
        );
      });
    });
  });
});
