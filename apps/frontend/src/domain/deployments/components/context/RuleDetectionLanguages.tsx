import type { ComponentType } from 'react';
import {
  PMBox,
  PMHStack,
  PMIcon,
  PMMenu,
  PMPortal,
  PMText,
} from '@packmind/ui';
import { LuChevronDown, LuCircleCheck, LuCircleOff } from 'react-icons/lu';
import { TiWarningOutline } from 'react-icons/ti';
import type {
  ActiveDetectionProgramId,
  ProgrammingLanguage,
  Rule,
  StandardId,
} from '@packmind/types';
import { DetectionSeverity } from '@packmind/types';
import { getLanguageDisplayName } from '@packmind/proprietary/frontend/domain/detection/components/DetectionCardUtils';
import { useUpdateActiveDetectionProgramSeverityMutation } from '@packmind/proprietary/frontend/domain/detection/api/queries/DetectionProgramQueries';
import type { RuleDetection, RuleDetectionState } from './ruleDetection';

/**
 * The languages a rule is detected in, each with its state and what it reports
 * a violation as.
 *
 * One component in two places, which is the point of it being one: the row in
 * the standard's body opens onto this, and the rule's own depth in the pane
 * carries it above its tabs. Two copies would be two chances to disagree about
 * a fact the reader is about to change.
 *
 * The two places are not redundant. A list of rules is where two of them are
 * compared, which is why more than one row opens at a time; a rule's own depth
 * is where one of them is worked on, and its state is the first thing that
 * decides whether the work is needed.
 */
export function RuleDetectionLanguages({
  standardId,
  ruleId,
  detection,
}: Readonly<{
  standardId: StandardId;
  ruleId: Rule['id'];
  detection: RuleDetection;
}>) {
  return (
    <PMHStack gap={3} minWidth={0} flexWrap="wrap">
      {detection.languages.map(
        ({ language, state, severity, activeDetectionProgramId }) => (
          <PMHStack key={language} gap={1.5}>
            <RuleDetectionMark state={state} />
            <PMText fontSize="xs" color="secondary" whiteSpace="nowrap">
              {getLanguageDisplayName(language)}
            </PMText>
            {severity && activeDetectionProgramId && (
              <RuleSeverityControl
                standardId={standardId}
                ruleId={ruleId}
                language={language}
                severity={severity}
                activeDetectionProgramId={activeDetectionProgramId}
              />
            )}
          </PMHStack>
        ),
      )}
    </PMHStack>
  );
}

/**
 * What a language reports a violation as, and the way to change it.
 *
 * The one thing on the Instructions tab a reader can set rather than read, and
 * it is here rather than in the row above because a severity belongs to a
 * language: the row's own label is about the rule, which is several languages
 * at once.
 *
 * Not `SeverityDropdownBadge`, which is what the standard's rule table uses.
 * That control is a filled red or yellow button a hundred pixels wide reading
 * "Report as error", sized for a table cell. Two of them inside a list of rules
 * would be the loudest thing on a tab whose subject is prose, and the mark
 * beside the language already spends this row's colour on the state. So the
 * word carries the setting in the neutral ramp, and the menu keeps the table's
 * own sentences, so nobody has to learn the mapping twice.
 *
 * Neutral is not the same as faint, which is how it shipped: `text.secondary`
 * inside a `border.tertiary` outline read as a label rather than a control,
 * quieter than the language name next to it. It has a filled body and a real
 * border now, which is what a flat design has left to say "this is pressable"
 * once colour is spoken for.
 *
 * The colour stays spoken for. `error` in red and `warning` in amber would put
 * a second semantic colour a centimetre from the mark that says whether the
 * language is enforced at all, and a reader would compare them. The two facts
 * are unrelated: one is whether anything checks the rule, the other is how
 * loudly it complains when it does.
 *
 * The words are the API's: `error` and `warning` are what `DetectionSeverity`
 * spells, and inventing softer ones here would be a third vocabulary for one
 * fact.
 */
function RuleSeverityControl({
  standardId,
  ruleId,
  language,
  severity,
  activeDetectionProgramId,
}: Readonly<{
  standardId: StandardId;
  ruleId: Rule['id'];
  language: ProgrammingLanguage;
  severity: DetectionSeverity;
  activeDetectionProgramId: ActiveDetectionProgramId;
}>) {
  const updateSeverity = useUpdateActiveDetectionProgramSeverityMutation();
  const languageName = getLanguageDisplayName(language);

  return (
    <PMMenu.Root>
      <PMMenu.Trigger asChild>
        <PMBox
          as="button"
          /*
            Announced rather than set: `PMBox` takes no `disabled`, and the two
            menu items below are what actually mutate, so that is where the
            in-flight state is enforced.
          */
          aria-disabled={updateSeverity.isPending || undefined}
          aria-label={`Reported as ${severity} in ${languageName}`}
          display="inline-flex"
          alignItems="center"
          gap="2px"
          fontSize="xs"
          fontWeight="medium"
          /*
            A chip with a body, not a word with a hairline round it. Reading the
            severity and reading that it can be changed are the same glance, and
            at `text.secondary` inside a `border.tertiary` outline the second
            half of that glance was missing: the control sat quieter than the
            language name beside it, which is a label.
          */
          color="text.primary"
          backgroundColor="background.secondary"
          paddingX={1.5}
          paddingY="1px"
          borderRadius="sm"
          borderWidth="1px"
          borderColor="border.primary"
          whiteSpace="nowrap"
          cursor={updateSeverity.isPending ? 'progress' : 'pointer'}
          _hover={{
            backgroundColor: 'background.tertiary',
            borderColor: 'border.secondary',
          }}
          _focusVisible={{
            outline: '2px solid',
            outlineColor: 'branding.primary',
            outlineOffset: '1px',
          }}
          transition="background-color 150ms ease-out, border-color 150ms ease-out"
        >
          {severity}
          <PMIcon
            as="span"
            display="inline-flex"
            fontSize="xs"
            color="text.secondary"
          >
            <LuChevronDown />
          </PMIcon>
        </PMBox>
      </PMMenu.Trigger>
      <PMPortal>
        <PMMenu.Positioner>
          <PMMenu.Content>
            {SEVERITY_CHOICES.map((choice) => (
              <PMMenu.Item
                key={choice.value}
                value={choice.value}
                disabled={choice.value === severity || updateSeverity.isPending}
                onClick={() =>
                  updateSeverity.mutate({
                    standardId,
                    ruleId,
                    activeDetectionProgramId,
                    severity: choice.value,
                  })
                }
              >
                {choice.label}
              </PMMenu.Item>
            ))}
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
}

/** The table's own labels, in the table's own order. */
const SEVERITY_CHOICES: readonly {
  value: DetectionSeverity;
  label: string;
}[] = [
  { value: DetectionSeverity.ERROR, label: 'Report as error' },
  { value: DetectionSeverity.WARNING, label: 'Report as warning' },
];

/**
 * The mark beside a detection status. Three shapes, used by the rule's own
 * status and by each of its languages: the collapsed row and the languages it
 * opens onto have to agree, or the reader learns the mapping twice.
 *
 * The shapes are the ones the standard's rule summary already uses, so the two
 * screens do not disagree either for as long as both exist.
 */
const RULE_DETECTION_MARKS: Record<
  RuleDetectionState,
  { Icon: ComponentType; color: string }
> = {
  active: { Icon: LuCircleCheck, color: 'text.success' },
  'in-progress': { Icon: TiWarningOutline, color: 'text.warning' },
  inactive: { Icon: LuCircleOff, color: 'text.tertiary' },
};

export function RuleDetectionMark({
  state,
}: Readonly<{ state: RuleDetectionState }>) {
  const { Icon, color } = RULE_DETECTION_MARKS[state];

  return (
    <PMIcon as="span" display="inline-flex" fontSize="sm" color={color}>
      <Icon />
    </PMIcon>
  );
}
