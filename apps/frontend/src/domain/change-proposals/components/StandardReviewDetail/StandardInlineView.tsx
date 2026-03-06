import { useMemo } from 'react';
import {
  PMBox,
  PMHeading,
  PMMarkdownViewer,
  PMText,
  PMVStack,
} from '@packmind/ui';
import {
  ChangeProposalType,
  CollectionItemDeletePayload,
  CollectionItemUpdatePayload,
  Rule,
  RuleId,
  Standard,
} from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { extractProposalDiffValues } from '../../utils/extractProposalDiffValues';
import { renderDiffText } from '../../utils/renderDiffText';
import { buildDiffSections } from '../../utils/buildDiffSections';

interface StandardInlineViewProps {
  proposal: ChangeProposalWithConflicts;
  standard: Standard;
  rules: Rule[];
}

const standardProposalTypes = new Set([
  ChangeProposalType.updateStandardName,
  ChangeProposalType.updateStandardDescription,
  ChangeProposalType.updateStandardScope,
  ChangeProposalType.addRule,
  ChangeProposalType.updateRule,
  ChangeProposalType.deleteRule,
]);

function isStandardProposal(type: ChangeProposalType): boolean {
  return standardProposalTypes.has(type);
}

export function StandardInlineView({
  proposal,
  standard,
  rules,
}: Readonly<StandardInlineViewProps>) {
  const { oldValue, newValue } = extractProposalDiffValues(proposal);

  const sortedRules = useMemo(
    () =>
      [...rules].sort((a, b) =>
        a.content.toLowerCase().localeCompare(b.content.toLowerCase()),
      ),
    [rules],
  );

  const targetRuleId = useMemo(() => {
    if (proposal.type === ChangeProposalType.updateRule) {
      return (proposal.payload as CollectionItemUpdatePayload<RuleId>).targetId;
    }
    if (proposal.type === ChangeProposalType.deleteRule) {
      return (
        proposal.payload as CollectionItemDeletePayload<{
          id: string;
          content: string;
        }>
      ).targetId as RuleId;
    }
    return null;
  }, [proposal]);

  if (!isStandardProposal(proposal.type)) {
    return null;
  }

  const isNameChange = proposal.type === ChangeProposalType.updateStandardName;
  const isDescriptionChange =
    proposal.type === ChangeProposalType.updateStandardDescription;
  const isScopeChange =
    proposal.type === ChangeProposalType.updateStandardScope;
  const isAddRule = proposal.type === ChangeProposalType.addRule;
  const isUpdateRule = proposal.type === ChangeProposalType.updateRule;
  const isDeleteRule = proposal.type === ChangeProposalType.deleteRule;
  const isRuleChange = isAddRule || isUpdateRule || isDeleteRule;

  return (
    <PMBox>
      {/* Name section */}
      <PMBox mb={4}>
        {isNameChange ? (
          <PMHeading size="h5">{renderDiffText(oldValue, newValue)}</PMHeading>
        ) : (
          <PMHeading size="h5" color={isRuleChange ? 'faded' : undefined}>
            {standard.name}
          </PMHeading>
        )}
      </PMBox>

      {/* Description section */}
      <PMBox
        mb={4}
        fontSize="sm"
        opacity={isDescriptionChange ? 1 : isRuleChange ? 0.5 : 0.7}
      >
        {isDescriptionChange ? (
          <DescriptionInlineDiff oldValue={oldValue} newValue={newValue} />
        ) : (
          <PMMarkdownViewer content={standard.description} />
        )}
      </PMBox>

      {/* Scope section */}
      {(standard.scope || isScopeChange) && (
        <PMBox mb={4}>
          <PMText as="p" fontSize="md" fontWeight="semibold" mb={1}>
            Scope
          </PMText>
          {isScopeChange ? (
            <PMText fontSize="sm">{renderDiffText(oldValue, newValue)}</PMText>
          ) : (
            <PMText fontSize="sm" color="faded">
              {standard.scope}
            </PMText>
          )}
        </PMBox>
      )}

      {/* Rules section */}
      {(sortedRules.length > 0 || isAddRule) && (
        <PMVStack gap={2} align="stretch" marginTop={2}>
          <PMText fontSize="md" fontWeight="semibold">
            Rules
          </PMText>

          {sortedRules.map((rule) => {
            if (isDeleteRule && rule.id === targetRuleId) {
              return (
                <PMBox
                  key={rule.id}
                  p={3}
                  bg="red.500/10"
                  borderLeft="2px solid"
                  borderColor="red.500/30"
                  borderRadius="md"
                >
                  <PMText
                    fontSize="sm"
                    textDecoration="line-through"
                    color="error"
                  >
                    {rule.content}
                  </PMText>
                </PMBox>
              );
            }

            if (isUpdateRule && rule.id === targetRuleId) {
              return (
                <PMBox
                  key={rule.id}
                  p={3}
                  bg="background.tertiary"
                  borderLeft="2px solid"
                  borderColor="border.tertiary"
                  borderRadius="md"
                >
                  <PMText fontSize="sm">
                    {renderDiffText(oldValue, newValue)}
                  </PMText>
                </PMBox>
              );
            }

            return (
              <PMBox key={rule.id} p={3} bg="background.tertiary">
                <PMText
                  fontSize="sm"
                  color={isRuleChange ? 'faded' : 'primary'}
                >
                  {rule.content}
                </PMText>
              </PMBox>
            );
          })}

          {isAddRule && (
            <PMBox
              p={3}
              bg="green.500/10"
              borderLeft="2px solid"
              borderColor="green.500/30"
              borderRadius="md"
            >
              <PMText fontSize="sm" color="success">
                {newValue}
              </PMText>
            </PMBox>
          )}
        </PMVStack>
      )}
    </PMBox>
  );
}

/**
 * Renders markdown description with inline word-level diffs.
 * Uses buildDiffSections to find changed regions, then renders
 * unchanged sections as normal markdown and changed sections with
 * word-level diff highlighting via renderDiffText.
 */
function DescriptionInlineDiff({
  oldValue,
  newValue,
}: Readonly<{
  oldValue: string;
  newValue: string;
}>) {
  const sections = useMemo(
    () => buildDiffSections(oldValue, newValue),
    [oldValue, newValue],
  );

  return (
    <PMBox fontSize="sm">
      {sections.map((section, index) =>
        section.type === 'unchanged' ? (
          <PMMarkdownViewer key={index} content={section.value} />
        ) : (
          <PMBox
            key={index}
            borderRadius="md"
            border="1px dashed"
            borderColor="border.tertiary"
            p={3}
            my={2}
          >
            <PMText fontSize="sm" lineHeight="tall">
              {renderDiffText(section.oldValue, section.newValue)}
            </PMText>
          </PMBox>
        ),
      )}
    </PMBox>
  );
}
