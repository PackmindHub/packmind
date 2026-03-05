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
import { buildDiffSections } from '../../utils/buildDiffSections';
import { DiffBlock } from '../shared/DiffBlock';

interface StandardFocusedViewProps {
  proposal: ChangeProposalWithConflicts;
  standard: Standard;
  rules: Rule[];
}

const standardProposalTypes = new Set<ChangeProposalType>([
  ChangeProposalType.updateStandardName,
  ChangeProposalType.updateStandardDescription,
  ChangeProposalType.updateStandardScope,
  ChangeProposalType.addRule,
  ChangeProposalType.updateRule,
  ChangeProposalType.deleteRule,
]);

function getTargetRuleId(
  proposal: ChangeProposalWithConflicts,
): RuleId | undefined {
  if (
    proposal.type === ChangeProposalType.updateRule ||
    proposal.type === ChangeProposalType.deleteRule
  ) {
    const payload = proposal.payload as
      | CollectionItemUpdatePayload<RuleId>
      | CollectionItemDeletePayload<{ id: string; content: string }>;
    return payload.targetId as RuleId;
  }
  return undefined;
}

export function StandardFocusedView({
  proposal,
  standard,
  rules,
}: Readonly<StandardFocusedViewProps>) {
  const { oldValue, newValue } = extractProposalDiffValues(proposal);

  const isStandardProposal = standardProposalTypes.has(proposal.type);
  const isNameChange = proposal.type === ChangeProposalType.updateStandardName;
  const isDescriptionChange =
    proposal.type === ChangeProposalType.updateStandardDescription;
  const isScopeChange =
    proposal.type === ChangeProposalType.updateStandardScope;
  const isAddRule = proposal.type === ChangeProposalType.addRule;
  const isUpdateRule = proposal.type === ChangeProposalType.updateRule;
  const isDeleteRule = proposal.type === ChangeProposalType.deleteRule;

  const contextOpacity = 0.5;

  const targetRuleId = getTargetRuleId(proposal);

  const sortedRules = useMemo(
    () =>
      [...rules].sort((a, b) =>
        a.content.toLowerCase().localeCompare(b.content.toLowerCase()),
      ),
    [rules],
  );

  const descriptionSections = useMemo(
    () => (isDescriptionChange ? buildDiffSections(oldValue, newValue) : []),
    [isDescriptionChange, oldValue, newValue],
  );

  if (!isStandardProposal) {
    return null;
  }

  return (
    <PMBox>
      {/* Name section */}
      <PMBox mb={4}>
        {isNameChange ? (
          <PMVStack gap={2} align="stretch">
            <PMText fontSize="xs" fontWeight="semibold" color="secondary">
              Name change
            </PMText>
            <DiffBlock value={oldValue} variant="removed" isMarkdown={false} />
            <DiffBlock value={newValue} variant="added" isMarkdown={false} />
          </PMVStack>
        ) : (
          <PMHeading size="h5" color="primary" opacity={contextOpacity}>
            {standard.name}
          </PMHeading>
        )}
      </PMBox>

      {/* Scope section */}
      {(standard.scope || isScopeChange) && (
        <PMBox mb={4}>
          {isScopeChange ? (
            <PMVStack gap={2} align="stretch">
              <PMText fontSize="xs" fontWeight="semibold" color="secondary">
                Scope change
              </PMText>
              {oldValue && (
                <DiffBlock
                  value={oldValue}
                  variant="removed"
                  isMarkdown={false}
                />
              )}
              {newValue && (
                <DiffBlock
                  value={newValue}
                  variant="added"
                  isMarkdown={false}
                />
              )}
            </PMVStack>
          ) : (
            <PMBox opacity={contextOpacity}>
              <PMText as="p" fontSize="md" fontWeight="semibold">
                Scope
              </PMText>
              <PMText fontSize="sm" color="faded" mt={1}>
                {standard.scope}
              </PMText>
            </PMBox>
          )}
        </PMBox>
      )}

      {/* Description section */}
      <PMBox mb={4}>
        {isDescriptionChange ? (
          <PMBox fontSize="sm">
            {descriptionSections.map((section, index) =>
              section.type === 'unchanged' ? (
                <PMMarkdownViewer key={index} content={section.value} />
              ) : (
                <PMBox
                  key={index}
                  borderRadius="md"
                  border="1px dashed"
                  borderColor="border.tertiary"
                  p={4}
                  my={2}
                >
                  {section.oldValue && (
                    <DiffBlock
                      value={section.oldValue}
                      variant="removed"
                      isMarkdown={true}
                    />
                  )}
                  {section.newValue && (
                    <PMBox mt={section.oldValue ? 2 : 0}>
                      <DiffBlock
                        value={section.newValue}
                        variant="added"
                        isMarkdown={true}
                      />
                    </PMBox>
                  )}
                </PMBox>
              ),
            )}
          </PMBox>
        ) : (
          <PMBox opacity={contextOpacity} fontSize="sm">
            <PMMarkdownViewer content={standard.description} />
          </PMBox>
        )}
      </PMBox>

      {/* Rules section */}
      {(sortedRules.length > 0 || isAddRule) && (
        <PMVStack gap={2} align="stretch" marginTop={2}>
          <PMText fontSize="md" fontWeight="semibold">
            Rules
          </PMText>

          {sortedRules.map((rule) => {
            const isTargetRule = rule.id === targetRuleId;

            if (isTargetRule && isUpdateRule) {
              return (
                <PMBox key={rule.id}>
                  <DiffBlock
                    value={oldValue}
                    variant="removed"
                    isMarkdown={false}
                  />
                  <PMBox mt={2}>
                    <DiffBlock
                      value={newValue}
                      variant="added"
                      isMarkdown={false}
                    />
                  </PMBox>
                </PMBox>
              );
            }

            if (isTargetRule && isDeleteRule) {
              return (
                <PMBox key={rule.id}>
                  <DiffBlock
                    value={rule.content}
                    variant="removed"
                    isMarkdown={false}
                    showIndicator={false}
                  />
                </PMBox>
              );
            }

            return (
              <PMBox
                key={rule.id}
                p={3}
                bg="background.tertiary"
                opacity={contextOpacity}
              >
                <PMText fontSize="sm" color="primary">
                  {rule.content}
                </PMText>
              </PMBox>
            );
          })}

          {isAddRule && (
            <DiffBlock
              value={newValue}
              variant="added"
              isMarkdown={false}
              showIndicator={false}
            />
          )}
        </PMVStack>
      )}
    </PMBox>
  );
}
