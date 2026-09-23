import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { ProgrammingLanguage } from '@packmind/types';

/**
 * What has been typed into a rule's examples and not saved yet.
 *
 * It lives here, above the tabs and above the language, because that is the
 * only place it survives. An example's editor used to hold its own values, and
 * three ordinary moves threw them away without saying so: changing the language
 * unmounted the card, moving to the Linter tab unmounted the whole body, and
 * correcting the language of a draft ran an effect that blanked both fields.
 * None of the three is a discard, and a surface where a discard has to be
 * guessed from a disappearance is a surface people stop typing into.
 *
 * Keyed by example id, so one store covers both halves of the same act: a new
 * example being written and an existing one being corrected. An entry existing
 * *is* the edit mode; there is no second flag that can disagree with it.
 */
export type RuleExampleDraft = {
  /** The example's own id once it has one, a generated one until then. */
  id: string;
  lang: ProgrammingLanguage;
  positive: string;
  negative: string;
  /** Saving creates rather than updates. */
  isNew: boolean;
};

export type RuleExampleDraftsStore = {
  /** The buffer for an example, or nothing when it is not being edited. */
  get(id: string): RuleExampleDraft | undefined;
  /** The unsaved new examples of one language, oldest first. */
  newDraftsFor(language: ProgrammingLanguage): readonly RuleExampleDraft[];
  /** Opens a buffer. Returns the id it is keyed by. */
  open(draft: Omit<RuleExampleDraft, 'id'> & { id?: string }): string;
  patch(id: string, values: Partial<RuleExampleDraft>): void;
  /**
   * Carries a draft to another language, which is the correction the card's own
   * language field makes: the code follows the reader rather than the reader
   * retyping it under a new heading.
   */
  move(id: string, language: ProgrammingLanguage): void;
  discard(id: string): void;
  /**
   * The languages holding a new example with something in it. What the rail
   * marks, so leaving a language does not hide that work is parked there.
   *
   * Only new ones, and only non-empty ones: an empty draft is the form a
   * language opens with rather than a thing somebody wrote, and a correction to
   * a saved example is already visible as an example in the list.
   */
  dirtyLanguages: readonly ProgrammingLanguage[];
};

const RuleExampleDraftsContext = createContext<RuleExampleDraftsStore | null>(
  null,
);

export function useRuleExampleDraftsStore(): RuleExampleDraftsStore {
  const [drafts, setDrafts] = useState<readonly RuleExampleDraft[]>([]);
  /*
    A counter rather than a clock: two examples opened in the same millisecond
    used to collide on `Date.now()`, and React then reused one card for both.
  */
  const nextId = useRef(0);

  const open = useCallback(
    (draft: Omit<RuleExampleDraft, 'id'> & { id?: string }) => {
      const id = draft.id ?? `draft-${(nextId.current += 1)}`;
      setDrafts((previous) =>
        previous.some((entry) => entry.id === id)
          ? previous
          : [...previous, { ...draft, id }],
      );
      return id;
    },
    [],
  );

  const patch = useCallback((id: string, values: Partial<RuleExampleDraft>) => {
    setDrafts((previous) =>
      previous.map((entry) =>
        entry.id === id ? { ...entry, ...values } : entry,
      ),
    );
  }, []);

  const move = useCallback(
    (id: string, language: ProgrammingLanguage) => {
      patch(id, { lang: language });
    },
    [patch],
  );

  const discard = useCallback((id: string) => {
    setDrafts((previous) => previous.filter((entry) => entry.id !== id));
  }, []);

  return useMemo(
    () => ({
      get: (id) => drafts.find((entry) => entry.id === id),
      newDraftsFor: (language) =>
        drafts.filter((entry) => entry.isNew && entry.lang === language),
      open,
      patch,
      move,
      discard,
      dirtyLanguages: Array.from(
        new Set(
          drafts
            .filter((entry) => entry.isNew && hasContent(entry))
            .map((entry) => entry.lang),
        ),
      ),
    }),
    [drafts, open, patch, move, discard],
  );
}

export function hasContent(
  draft: Pick<RuleExampleDraft, 'positive' | 'negative'>,
): boolean {
  return draft.positive.trim() !== '' || draft.negative.trim() !== '';
}

export function RuleExampleDraftsProvider({
  store,
  children,
}: Readonly<{ store: RuleExampleDraftsStore; children: ReactNode }>) {
  return (
    <RuleExampleDraftsContext.Provider value={store}>
      {children}
    </RuleExampleDraftsContext.Provider>
  );
}

export function useRuleExampleDrafts(): RuleExampleDraftsStore {
  const store = useContext(RuleExampleDraftsContext);

  if (!store) {
    throw new Error(
      'Rule example drafts are read outside RuleExampleDraftsProvider',
    );
  }

  return store;
}
