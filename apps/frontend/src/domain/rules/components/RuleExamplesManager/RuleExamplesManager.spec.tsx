import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import type { Mock } from 'vitest';
import {
  ProgrammingLanguage,
  createRuleId,
  createStandardId,
} from '@packmind/types';
import type { RuleExample } from '@packmind/types';
import { useGetRuleExamplesQuery } from '../../api/queries';
import {
  RuleExampleDraftsProvider,
  useRuleExampleDraftsStore,
} from '../../hooks/useRuleExampleDrafts';
import { RuleExamplesManager } from './RuleExamplesManager';

vi.mock('../../api/queries', () => ({
  useGetRuleExamplesQuery: vi.fn(),
  useCreateRuleExampleMutation: vi.fn(() => ({
    isPending: false,
    mutateAsync: vi.fn(),
  })),
  useUpdateRuleExampleMutation: vi.fn(() => ({ isPending: false })),
  useDeleteRuleExampleMutation: vi.fn(() => ({ isPending: false })),
}));

vi.mock('../../../accounts/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ organization: { id: 'org-1' } }),
}));

vi.mock('../../../spaces/hooks/useCurrentSpace', () => ({
  useCurrentSpace: () => ({ spaceId: 'space-1' }),
}));

/*
  The detection query key is read through the edition alias, which resolves to a
  stub in one repository and to the real module in the other.
*/
vi.mock(
  '@packmind/proprietary/frontend/domain/detection/api/queryKeys',
  () => ({
    GET_STANDARD_RULES_DETECTION_STATUS_KEY: ['detection-status'],
  }),
);

/*
  CodeMirror brings a whole editor and a layout measurement pass with it, and
  what this file is about is which cards the language shows and what survives
  leaving it. A textarea carries the same two values.
*/
vi.mock('@packmind/ui', async () => {
  const actual =
    await vi.importActual<typeof import('@packmind/ui')>('@packmind/ui');

  return {
    ...actual,
    PMCodeMirror: ({
      value,
      onChange,
      placeholder,
      editable,
    }: {
      value: string;
      onChange?: (value: string) => void;
      placeholder?: string;
      editable?: boolean;
    }) => (
      <textarea
        aria-label={placeholder}
        value={value}
        readOnly={!editable}
        onChange={(event) => onChange?.(event.target.value)}
      />
    ),
  };
});

const STANDARD_ID = createStandardId('standard-1');
const RULE_ID = createRuleId('rule-1');

const DO_FIELD = 'Code complying with the rule...';

function withExamples(...examples: Partial<RuleExample>[]) {
  (useGetRuleExamplesQuery as Mock).mockReturnValue({
    data: examples,
    isLoading: false,
    isError: false,
  });
}

/**
 * The manager under the store it reads from, plus the way a language is changed
 * from outside it, which is what the rail does on the real surface.
 */
function Harness({ initialLanguage }: Readonly<{ initialLanguage: string }>) {
  const store = useRuleExampleDraftsStore();
  const [language, setLanguage] = React.useState(
    initialLanguage as ProgrammingLanguage,
  );

  return (
    <RuleExampleDraftsProvider store={store}>
      <button
        type="button"
        onClick={() => setLanguage(ProgrammingLanguage.PYTHON)}
      >
        go to python
      </button>
      <button
        type="button"
        onClick={() => setLanguage(ProgrammingLanguage.JAVA)}
      >
        go to java
      </button>
      <RuleExamplesManager
        standardId={STANDARD_ID}
        ruleId={RULE_ID}
        selectedLanguage={language}
        onLanguageChange={setLanguage}
      />
    </RuleExampleDraftsProvider>
  );
}

async function renderManager(language = ProgrammingLanguage.JAVA) {
  await act(async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <UIProvider>
          <Harness initialLanguage={language} />
        </UIProvider>
      </QueryClientProvider>,
    );
  });
}

describe('RuleExamplesManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when the language has nothing in it', () => {
    beforeEach(async () => {
      withExamples();
      await renderManager();
    });

    /*
      The editor is the content: there is nothing to read, so a sentence saying
      so and a button to reach the only thing this screen does is a door in
      front of an empty room.
    */
    it('opens on an empty pair rather than on a sentence', () => {
      expect(screen.getByLabelText(DO_FIELD)).toBeVisible();
    });

    it('says nothing about examples being absent', () => {
      expect(screen.queryByText(/no examples/i)).not.toBeInTheDocument();
    });

    /*
      Nothing behind it to come back to.
    */
    it('offers no way to cancel the form it opened with', () => {
      expect(
        screen.queryByRole('button', { name: /cancel/i }),
      ).not.toBeInTheDocument();
    });

    /*
      Saving an empty pair discarded the form and opened the same one again,
      which is a button that does nothing twice.
    */
    it('cannot be saved until something is written', () => {
      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });

    it('can be saved once something is', async () => {
      await userEvent.type(screen.getByLabelText(DO_FIELD), 'something');

      expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();
    });
  });

  describe('when a language is left while something is being written', () => {
    beforeEach(async () => {
      withExamples();
      await renderManager();

      await userEvent.type(screen.getByLabelText(DO_FIELD), 'kept');
      await userEvent.click(
        screen.getByRole('button', { name: 'go to python' }),
      );
    });

    it('opens the language arrived at on its own empty pair', () => {
      expect(screen.getByLabelText(DO_FIELD)).toHaveValue('');
    });

    it('gives the work back on return', async () => {
      await userEvent.click(screen.getByRole('button', { name: 'go to java' }));

      expect(screen.getByLabelText(DO_FIELD)).toHaveValue('kept');
    });
  });

  describe("when a draft's own language is corrected", () => {
    beforeEach(async () => {
      withExamples();
      await renderManager();
      await userEvent.type(screen.getByLabelText(DO_FIELD), 'carried');
    });

    /*
      The card's language is a field of the record being written, so changing it
      carries the code across instead of starting the reader over. The rail
      follows the draft, which is why the harness hands `onLanguageChange` the
      same setter the buttons use.
    */
    it('carries the code to the language chosen', async () => {
      const [languageTrigger] = screen.getAllByRole('combobox');
      await userEvent.click(languageTrigger);
      await userEvent.click(await screen.findByText('Python'));

      expect(screen.getByLabelText(DO_FIELD)).toHaveValue('carried');
    });
  });

  describe('when the language already has an example', () => {
    beforeEach(async () => {
      withExamples({
        id: 'example-1' as RuleExample['id'],
        lang: ProgrammingLanguage.JAVA,
        positive: 'saved do',
        negative: 'saved dont',
      });
      await renderManager();
    });

    it('shows it rather than an empty form', () => {
      expect(screen.getAllByLabelText(DO_FIELD)[0]).toHaveValue('saved do');
    });

    it('still offers a second one', () => {
      expect(
        screen.getByRole('button', { name: /add example/i }),
      ).toBeVisible();
    });
  });
});
