import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import type { Mock } from 'vitest';
import {
  DetectionSeverity,
  ProgrammingLanguage,
  RuleLanguageDetectionStatus,
  createRuleId,
  createStandardId,
} from '@packmind/types';
import type { Rule } from '@packmind/types';
import { useGetRuleExamplesQuery } from '../../../rules/api/queries';
import { useGetStandardRulesDetectionStatusQuery } from '@packmind/proprietary/frontend/domain/detection/hooks/useStandardEditionFeatures';
import { EXAMPLES_TAB, LINTER_TAB } from './buildComponentDetail';
import { ContextRuleDetail } from './ContextRuleDetail';

vi.mock('../../../rules/api/queries', () => ({
  useGetRuleExamplesQuery: vi.fn(),
  useCreateRuleExampleMutation: vi.fn(() => ({ isPending: false })),
  useUpdateRuleExampleMutation: vi.fn(() => ({ isPending: false })),
  useDeleteRuleExampleMutation: vi.fn(() => ({ isPending: false })),
}));

vi.mock(
  '@packmind/proprietary/frontend/domain/detection/hooks/useStandardEditionFeatures',
  () => ({
    useGetStandardRulesDetectionStatusQuery: vi.fn(),
  }),
);

vi.mock(
  '@packmind/proprietary/frontend/domain/detection/api/queries/DetectionProgramQueries',
  () => ({
    useUpdateActiveDetectionProgramSeverityMutation: vi.fn(() => ({
      mutate: vi.fn(),
      isPending: false,
    })),
  }),
);

/*
  The language's display name lives behind the edition alias, so a case
  asserting on "Java" would read it in one repository and read nothing in the
  other.
*/
vi.mock(
  '@packmind/proprietary/frontend/domain/detection/components/DetectionCardUtils',
  () => ({
    getLanguageDisplayName: (language: string) => language,
  }),
);

vi.mock('../../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ organization: { id: 'org-1' } }),
}));

vi.mock('../../../spaces/hooks/useCurrentSpace', () => ({
  useCurrentSpace: () => ({ spaceId: 'space-1' }),
}));

/*
  The linter body is behind the edition alias and brings the whole detection
  domain with it. What this file is about is the frame: which tab is open, what
  the language select offers, and the way back.
*/
vi.mock(
  '@packmind/proprietary/frontend/domain/detection/components/ProgramEditor',
  () => ({
    ProgramEditor: () => <div>program editor</div>,
  }),
);

const STANDARD_ID = createStandardId('standard-1');

const RULE: Rule = {
  id: createRuleId('rule-1'),
  content: 'Use timeouts on all blocking calls',
} as Rule;

function withNoDetection() {
  (useGetStandardRulesDetectionStatusQuery as Mock).mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
  });
}

function withExamples(...languages: ProgrammingLanguage[]) {
  (useGetRuleExamplesQuery as Mock).mockReturnValue({
    data: languages.map((lang, index) => ({
      id: `example-${index}`,
      lang,
      positive: 'good',
      negative: 'bad',
    })),
    isLoading: false,
    isError: false,
  });
}

async function renderRule(tab: string = EXAMPLES_TAB) {
  await act(async () => {
    render(
      /*
        The examples body reaches for a client of its own: its rows hold the
        mutations that save and delete an example, and a provider is cheaper
        than mocking each one.
      */
      <QueryClientProvider client={new QueryClient()}>
        <UIProvider>
          <MemoryRouter>
            <ContextRuleDetail
              standardId={STANDARD_ID}
              rule={RULE}
              standardName="Java Best Practices"
              backHref="?component=standard-1"
              tab={tab}
              onTabChange={vi.fn()}
            />
          </MemoryRouter>
        </UIProvider>
      </QueryClientProvider>,
    );
  });
}

describe('ContextRuleDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withExamples(ProgrammingLanguage.JAVA);
    withNoDetection();
  });

  it('names the rule, which is what the depth is about', async () => {
    await renderRule();

    expect(screen.getByRole('heading', { name: RULE.content })).toBeVisible();
  });

  /*
    The standard rather than "Back", and to an address of this surface: the
    whole reason this component exists is that configuring a rule used to mean
    leaving Context for a page.
  */
  it('comes back to the standard by name', async () => {
    await renderRule();

    expect(
      screen
        .getByRole('link', { name: /java best practices/i })
        .getAttribute('href'),
    ).toContain('component=standard-1');
  });

  it('offers the examples and the linter as the two halves of a rule', async () => {
    await renderRule();

    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('opens on the examples', async () => {
    await renderRule();

    expect(screen.getByRole('tab', { name: /code examples/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('opens on the linter when the address asks for it', async () => {
    await renderRule(LINTER_TAB);

    expect(screen.getByText('program editor')).toBeVisible();
  });

  describe('when a language reports on the rule', () => {
    beforeEach(() => {
      (useGetStandardRulesDetectionStatusQuery as Mock).mockReturnValue({
        data: [
          {
            ruleId: RULE.id,
            languages: [
              {
                language: ProgrammingLanguage.JAVA,
                status: RuleLanguageDetectionStatus.OK,
                severity: DetectionSeverity.WARNING,
                activeDetectionProgramId: 'program-1',
              },
            ],
          },
        ],
        isLoading: false,
        isError: false,
      });
    });

    /*
      The state of the rule, above the two halves rather than inside one, and
      the thing that decides whether the work below is needed. It is on the row
      this depth was opened from too, and the two read one query.
    */
    it('says where the rule is enforced', async () => {
      await renderRule();

      expect(screen.getByText('Detected in')).toBeVisible();
    });

    it('offers the severity of that language', async () => {
      await renderRule();

      expect(
        screen.getByRole('button', { name: /reported as warning in java/i }),
      ).toBeVisible();
    });
  });

  describe('when nothing has ever been pointed at the rule', () => {
    /*
      The same silence the row keeps. A line reading that no language detects it
      would announce the state of a thing the reader is here to create.
    */
    it('says nothing about where it is enforced', async () => {
      await renderRule();

      expect(screen.queryByText('Detected in')).not.toBeInTheDocument();
    });
  });

  describe('when the rule has examples in no language at all', () => {
    beforeEach(() => {
      withExamples();
    });

    /*
      A program is generated from examples, so there is nothing for that tab to
      be about yet. Disabled rather than absent: the tab is what says a rule can
      be checked automatically, and a strip that grows one on a save reads as a
      different screen.
    */
    it('leaves the linter unreachable', async () => {
      await renderRule();

      expect(screen.getByRole('tab', { name: /linter/i })).toBeDisabled();
    });

    it('still offers the examples, which is where the first one is written', async () => {
      await renderRule();

      expect(screen.getByRole('tab', { name: /code examples/i })).toBeEnabled();
    });
  });
});
