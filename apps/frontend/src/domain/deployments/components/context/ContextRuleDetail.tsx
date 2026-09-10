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
import { RuleExamplesManager } from '../../../rules/components/RuleExamplesManager';
import { RuleLanguageSelect } from '../../../rules/components/RuleLanguageSelect';
import { useGetRuleExamplesQuery } from '../../../rules/api/queries';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { EXAMPLES_TAB, LINTER_TAB } from './buildComponentDetail';

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
   * The examples, for two things this frame decides and the bodies below it do
   * not: which languages the select calls configured, and which one to open on.
   * The same query `RuleExamplesManager` runs, by the same key, so the two read
   * one answer rather than two that can disagree about whether a language has
   * examples.
   */
  const { data: examples } = useGetRuleExamplesQuery(
    organization?.id as OrganizationId,
    spaceId as SpaceId,
    standardId,
    rule.id,
  );

  const configuredLanguages = useMemo(() => {
    const languages = new Set(
      (examples ?? [])
        .map((example) => example.lang)
        .filter((language): language is ProgrammingLanguage => !!language),
    );

    /*
     * In display order rather than in the order the examples came back, so the
     * language this opens on is the same one the select shows first.
     */
    return getAllLanguagesSortedByDisplayName()
      .map(({ language }) => language)
      .filter((language) => languages.has(language));
  }, [examples]);

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
   * A program is generated from examples, so a language with none has nothing
   * for this tab to be about. Disabled rather than hidden: the tab is what says
   * a rule can be checked automatically at all, and a strip that gains a tab
   * when an example is saved reads as a different screen.
   */
  const hasExamples = configuredLanguages.includes(language);

  return (
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
            <PMTabsCompound.Trigger value={LINTER_TAB} disabled={!hasExamples}>
              Linter
            </PMTabsCompound.Trigger>
            {/*
              In the strip rather than above it, because it scopes both bodies
              and not one: the examples of a language and the program built from
              them are the same choice read twice.
            */}
            <PMHStack
              marginLeft="auto"
              gap={2}
              alignItems="center"
              flexShrink={0}
            >
              <PMText fontSize="xs" color="faded">
                Language
              </PMText>
              <RuleLanguageSelect
                configuredLanguages={configuredLanguages}
                value={language}
                onChange={setPicked}
                width="180px"
              />
            </PMHStack>
          </PMTabsCompound.List>

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
              Examples document the rule and feed the linter. They are not part
              of what a coding agent reads.
            </PMText>
            <PMBox paddingTop={3}>
              <RuleExamplesManager
                standardId={standardId}
                ruleId={rule.id}
                selectedLanguage={language}
                /*
                  The one place a language is added: a rule gains one by gaining
                  an example in it, so the creation form is where the choice
                  belongs and the select above is how it is reached.
                */
                allowLanguageSelection={!hasExamples}
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
  );
}
