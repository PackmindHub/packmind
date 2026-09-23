import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  PMBox,
  PMHStack,
  PMHeading,
  PMIcon,
  PMTabsCompound,
  PMText,
} from '@packmind/ui';
import { LuChevronLeft } from 'react-icons/lu';
import {
  ProgrammingLanguage,
  getAllLanguagesSortedByDisplayName,
  type OrganizationId,
  type Rule,
  type SpaceId,
  type StandardId,
} from '@packmind/types';
import { ProgramEditor } from '@packmind/proprietary/frontend/domain/detection/components/ProgramEditor';
import { useGetStandardRulesDetectionStatusQuery } from '@packmind/proprietary/frontend/domain/detection/hooks/useStandardEditionFeatures';
import { RuleExamplesManager } from '../../../rules/components/RuleExamplesManager';
import { RuleLanguageRail } from '../../../rules/components/RuleLanguageRail';
import { useGetRuleExamplesQuery } from '../../../rules/api/queries';
import {
  RuleExampleDraftsProvider,
  useRuleExampleDraftsStore,
} from '../../../rules/hooks/useRuleExampleDrafts';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { EXAMPLES_TAB, LINTER_TAB } from './buildComponentDetail';
import { ruleDetectionsById } from './ruleDetection';
import { RuleDetectionLanguages } from './RuleDetectionLanguages';

/**
 * One rule of a standard, set up in the pane the standard was read in.
 *
 * The depth exists because the row above it cannot hold this. A row says the
 * sentence and whether anything checks it, which is what reading a standard is
 * about; deciding *what* checks it is a screen's worth of work, the code
 * examples per language and the program generated from them. Until this, that
 * screen only existed on a page outside the surface, and following a rule out
 * of Context to configure it is the thing this redesign is about.
 *
 * The same move `ContextSkillFileDetail` is, one type over: a skill is a folder
 * and its files are its leaves, a standard is a document and its rules are its.
 * Both open in place of the component and both come back to it by name.
 *
 * The two bodies are the rule's own page's, unchanged. Configuring a rule is
 * the same act on both surfaces, so it is the same components; what this adds
 * is a frame that belongs to the pane instead of a page header repeating the
 * standard the reader just left.
 */
export function ContextRuleDetail({
  standardId,
  rule,
  standardName,
  backHref,
  tab,
  onTabChange,
}: Readonly<{
  standardId: StandardId;
  rule: Rule;
  /** The standard the rule belongs to, which is what the way back names. */
  standardName: string;
  /** The standard's own body in the pane, which is where the rule was opened from. */
  backHref: string;
  tab: string;
  onTabChange: (value: string) => void;
}>) {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  /*
    Owned here rather than inside the examples body, because here is the only
    place it survives what the reader does next: the tab strip below unmounts
    its panels, and the language above scopes them. Both used to take unsaved
    code with them.
  */
  const draftsStore = useRuleExampleDraftsStore();

  /*
   * The examples, for three things this frame decides and the bodies below it do
   * not: which languages the rail carries, how many each has, and which one to
   * open on. The same query `RuleExamplesManager` runs, by the same key, so the
   * two read one answer rather than two that can disagree about whether a
   * language has examples.
   */
  const { data: examples } = useGetRuleExamplesQuery(
    organization?.id as OrganizationId,
    spaceId as SpaceId,
    standardId,
    rule.id,
  );

  /*
   * Where the rule is enforced today, and how loudly.
   *
   * Here as well as on the row it was opened from, and neither is redundant: a
   * list of rules is where two of them are compared, a rule's own depth is
   * where one is worked on, and this is the fact that decides whether the work
   * below is needed at all. The same query the list runs, so the two cannot
   * disagree about a state the reader is about to change.
   */
  const { data: detectionStatuses } =
    useGetStandardRulesDetectionStatusQuery(standardId);

  const detection = useMemo(
    () => ruleDetectionsById(detectionStatuses).get(rule.id) ?? null,
    [detectionStatuses, rule.id],
  );

  const exampleCounts = useMemo(() => {
    const counts = new Map<ProgrammingLanguage, number>();

    (examples ?? []).forEach((example) => {
      if (example.lang) {
        counts.set(example.lang, (counts.get(example.lang) ?? 0) + 1);
      }
    });

    return counts;
  }, [examples]);

  const configuredLanguages = useMemo(() => {
    /*
     * In display order rather than in the order the examples came back, so the
     * language this opens on is the one the rail shows first.
     */
    return getAllLanguagesSortedByDisplayName()
      .map(({ language }) => language)
      .filter((language) => exampleCounts.has(language));
  }, [exampleCounts]);

  /*
   * Not in the address, unlike the tab.
   *
   * The tab is where the reader is; the language is which slice of it they are
   * reading, and it has a defensible answer without being asked: the first one
   * the rule has examples in. A rule with no examples at all opens on
   * JavaScript with nothing under it, which is the state the select's second
   * group is for.
   *
   * `undefined` until the examples answer, so the first render does not pick a
   * language the rule turns out to have none of and then move.
   */
  const [picked, setPicked] = useState<ProgrammingLanguage | undefined>();
  const language =
    picked ?? configuredLanguages[0] ?? ProgrammingLanguage.JAVASCRIPT;

  /*
   * What the rail carries, which is more than what is saved.
   *
   * A language holding a parked draft belongs on it, or leaving that language
   * would hide the work rather than keep it. So does the one being read, even
   * with nothing in it yet: the pair of editors below has to say which language
   * it is a pair of editors for.
   */
  const railLanguages = useMemo(() => {
    const carried = new Set<ProgrammingLanguage>([
      ...exampleCounts.keys(),
      ...draftsStore.dirtyLanguages,
      language,
    ]);

    return getAllLanguagesSortedByDisplayName()
      .map((entry) => entry.language)
      .filter((entry) => carried.has(entry));
  }, [exampleCounts, draftsStore.dirtyLanguages, language]);

  /*
   * A program is generated from examples, so a language with none has nothing
   * for this tab to be about. Disabled rather than hidden: the tab is what says
   * a rule can be checked automatically at all, and a strip that gains a tab
   * when an example is saved reads as a different screen.
   */
  const hasExamples = configuredLanguages.includes(language);

  return (
    <RuleExampleDraftsProvider store={draftsStore}>
      <PMBox padding={6}>
        <PMBox
          display="inline-flex"
          alignItems="center"
          gap="4px"
          fontSize="sm"
          color="text.faded"
          _hover={{ color: 'text.primary' }}
          transition="color 150ms ease-out"
          asChild
        >
          <Link to={backHref}>
            <PMIcon fontSize="sm">
              <LuChevronLeft />
            </PMIcon>
            {standardName}
          </Link>
        </PMBox>

        {/*
        The rule at the size prose is set in, not at heading size. It is a
        sentence, and the pane is narrow: capped at the measure every other
        title on this surface is capped at.
      */}
        <PMBox paddingTop={2} maxWidth="68ch">
          <PMHeading level="h2" fontSize="lg">
            {rule.content}
          </PMHeading>
        </PMBox>

        {/*
        Above the tabs rather than inside one, because it is about the rule and
        not about either half of it. Absent when nothing has ever been pointed
        at this rule, which is the same silence the row keeps: a line reading
        that no language detects it would announce the state of a thing the
        reader is on this screen to create.
      */}
        {detection && (
          <PMHStack gap={3} align="start" paddingTop={4}>
            <PMText fontSize="xs" color="faded" flexShrink={0}>
              Detected in
            </PMText>
            <RuleDetectionLanguages
              standardId={standardId}
              ruleId={rule.id}
              detection={detection}
            />
          </PMHStack>
        )}

        <PMBox paddingTop={5}>
          <PMTabsCompound.Root
            value={tab}
            onValueChange={(details) => onTabChange(details.value)}
            variant="line"
            width="100%"
            lazyMount
            unmountOnExit
          >
            <PMTabsCompound.List>
              <PMTabsCompound.Trigger value={EXAMPLES_TAB}>
                Code examples
              </PMTabsCompound.Trigger>
              <PMTabsCompound.Trigger
                value={LINTER_TAB}
                disabled={!hasExamples}
              >
                Linter
              </PMTabsCompound.Trigger>
            </PMTabsCompound.List>

            {/*
              Under the strip rather than in it, because it scopes both bodies
              and not one: the examples of a language and the program built from
              them are the same choice read twice. The strip is left to the two
              halves of a rule, which is all it can hold once a rule speaks more
              than one language.
            */}
            <PMBox paddingTop={4}>
              <RuleLanguageRail
                languages={railLanguages}
                value={language}
                counts={exampleCounts}
                unsaved={draftsStore.dirtyLanguages}
                onChange={setPicked}
              />
            </PMBox>

            <PMTabsCompound.Content value={EXAMPLES_TAB}>
              {/*
              The one thing about examples a reader would otherwise get wrong,
              and the rule's own page says it too: they document the rule and
              they feed the linter, and they are not part of what an agent
              reads. Someone writing a "Don't" block would reasonably assume
              the agent sees it.

              A line rather than the filled alert the page carries. The fact is
              permanent, so it is on screen permanently, and a permanent banner
              is the loudest thing on a surface built to be quiet.
            */}
              <PMText
                as="div"
                fontSize="xs"
                color="faded"
                paddingTop={3}
                maxWidth="72ch"
              >
                Examples document the rule and feed the linter, one detection
                program per language. They are not part of what a coding agent
                reads.
              </PMText>
              <PMBox paddingTop={3}>
                <RuleExamplesManager
                  standardId={standardId}
                  ruleId={rule.id}
                  selectedLanguage={language}
                  onLanguageChange={setPicked}
                />
              </PMBox>
            </PMTabsCompound.Content>

            <PMTabsCompound.Content value={LINTER_TAB}>
              <PMBox paddingTop={4}>
                <ProgramEditor
                  standardId={standardId}
                  ruleId={rule.id}
                  detectionLanguages={configuredLanguages.map((entry) =>
                    entry.toString(),
                  )}
                  selectedLanguage={language}
                  onNavigateToExamples={() => onTabChange(EXAMPLES_TAB)}
                />
              </PMBox>
            </PMTabsCompound.Content>
          </PMTabsCompound.Root>
        </PMBox>
      </PMBox>
    </RuleExampleDraftsProvider>
  );
}
