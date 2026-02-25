import { useMemo, useState } from 'react';
import { PMBox, PMText, PMVStack } from '@packmind/ui';
import {
  ChangeProposalId,
  ChangeProposalType,
  Standard,
  ScalarUpdatePayload,
  UserId,
  Rule,
  CollectionItemAddPayload,
  CollectionItemUpdatePayload,
  CollectionItemDeletePayload,
  RuleId,
  StandardVersionId,
} from '@packmind/types';
import {
  buildBlockedByAcceptedMap,
  buildProposalNumberMap,
} from '../../utils/changeProposalHelpers';
import { ChangeProposalWithConflicts } from '../../types';
import {
  MarkdownEditor,
  MarkdownEditorProvider,
} from '../../../../shared/components/editor/MarkdownEditor';
import { renderDiffText } from '../../utils/renderDiffText';
import { ProposalReviewHeader } from '../ProposalReviewHeader';
import {
  applyStandardProposals,
  getProposalNumbers,
} from '../../utils/applyStandardProposals';
import { HighlightedText, HighlightedRuleBox } from '../HighlightedContent';
import { UnifiedMarkdownViewer } from '../UnifiedMarkdownViewer';
import { useDiffNavigation } from '../../hooks/useDiffNavigation';
import { renderMarkdownDiffOrPreview } from '../SkillReviewDetail/SkillContent/renderMarkdownDiffOrPreview';

interface ProposalReviewPanelProps {
  selectedStandard: Standard | undefined;
  selectedStandardProposals: ChangeProposalWithConflicts[];
  rules: Rule[];
  reviewingProposalId: ChangeProposalId | null;
  outdatedProposalIds: Set<ChangeProposalId>;
  acceptedProposalIds: Set<ChangeProposalId>;
  rejectedProposalIds: Set<ChangeProposalId>;
  blockedByConflictIds: Set<ChangeProposalId>;
  userLookup: Map<UserId, string>;
  showUnifiedView: boolean;
  onSelectProposal: (proposalId: ChangeProposalId) => void;
  onPoolAccept: (proposalId: ChangeProposalId) => void;
  onPoolReject: (proposalId: ChangeProposalId) => void;
  onUndoPool: (proposalId: ChangeProposalId) => void;
}

export function ProposalReviewPanel({
  selectedStandard,
  selectedStandardProposals,
  rules,
  reviewingProposalId,
  outdatedProposalIds,
  acceptedProposalIds,
  rejectedProposalIds,
  blockedByConflictIds,
  userLookup,
  showUnifiedView,
  onSelectProposal,
  onPoolAccept,
  onPoolReject,
  onUndoPool,
}: Readonly<ProposalReviewPanelProps>) {
  const {
    currentIndex,
    totalChanges,
    hasScroll,
    goToNext,
    goToPrevious,
    scrollToCurrent,
  } = useDiffNavigation(reviewingProposalId);
  const [showPreview, setShowPreview] = useState(false);

  const proposalNumberMap = useMemo(
    () => buildProposalNumberMap(selectedStandardProposals),
    [selectedStandardProposals],
  );

  const blockedByAcceptedMap = useMemo(
    () =>
      buildBlockedByAcceptedMap(selectedStandardProposals, acceptedProposalIds),
    [selectedStandardProposals, acceptedProposalIds],
  );

  const reviewingProposal = reviewingProposalId
    ? (selectedStandardProposals.find((p) => p.id === reviewingProposalId) ??
      null)
    : null;

  // Compute unified preview when enabled
  const unifiedResult = useMemo(() => {
    if (
      !showUnifiedView ||
      !selectedStandard ||
      acceptedProposalIds.size === 0 ||
      reviewingProposal
    ) {
      return null;
    }
    return applyStandardProposals(
      selectedStandard,
      rules,
      selectedStandardProposals,
      acceptedProposalIds,
    );
  }, [
    showUnifiedView,
    selectedStandard,
    rules,
    selectedStandardProposals,
    acceptedProposalIds,
    reviewingProposal,
  ]);

  // Compute preview rules when a rule change proposal is selected
  const previewRules = useMemo(() => {
    if (!reviewingProposal) return rules;

    const proposalType = reviewingProposal.type;

    let resultRules = rules;

    if (proposalType === ChangeProposalType.addRule) {
      const payload = reviewingProposal.payload as CollectionItemAddPayload<
        Omit<Rule, 'id' | 'standardVersionId'>
      >;
      // Add the new rule at the end (use first rule's versionId or empty string)
      const standardVersionId =
        rules.length > 0
          ? rules[0].standardVersionId
          : ('' as StandardVersionId);
      resultRules = [
        ...rules,
        {
          ...payload.item,
          id: 'temp-new-rule' as RuleId,
          standardVersionId,
        },
      ];
    }

    if (proposalType === ChangeProposalType.updateRule) {
      const payload =
        reviewingProposal.payload as CollectionItemUpdatePayload<RuleId>;
      resultRules = rules.map((rule) =>
        rule.id === payload.targetId
          ? { ...rule, content: payload.newValue }
          : rule,
      );
    }

    if (proposalType === ChangeProposalType.deleteRule) {
      // Keep the deleted rule in the list so it can be shown with strikethrough styling
      resultRules = rules;
    }

    // Sort rules alphabetically by content (case-insensitive)
    return [...resultRules].sort((a, b) =>
      a.content.toLowerCase().localeCompare(b.content.toLowerCase()),
    );
  }, [reviewingProposal, rules]);

  // Helper function to determine rule change status
  const getRuleChangeStatus = (
    rule: Rule,
  ): 'added' | 'updated' | 'deleted' | null => {
    if (!reviewingProposal) return null;

    const proposalType = reviewingProposal.type;

    if (proposalType === ChangeProposalType.addRule) {
      return rule.id === ('temp-new-rule' as RuleId) ? 'added' : null;
    }

    if (proposalType === ChangeProposalType.updateRule) {
      const payload =
        reviewingProposal.payload as CollectionItemUpdatePayload<RuleId>;
      return rule.id === payload.targetId ? 'updated' : null;
    }

    if (proposalType === ChangeProposalType.deleteRule) {
      const payload = reviewingProposal.payload as CollectionItemDeletePayload<
        Omit<Rule, 'standardVersionId'>
      >;
      return rule.id === payload.targetId ? 'deleted' : null;
    }

    return null;
  };

  if (reviewingProposal) {
    const payload = reviewingProposal.payload as ScalarUpdatePayload;
    const isOutdated = outdatedProposalIds.has(reviewingProposal.id);

    const isNameDiff =
      reviewingProposal.type === ChangeProposalType.updateStandardName;
    const isDescriptionDiff =
      reviewingProposal.type === ChangeProposalType.updateStandardDescription;

    return (
      <PMVStack gap={4} align="stretch">
        <ProposalReviewHeader
          proposal={reviewingProposal}
          isOutdated={isOutdated}
          proposalNumberMap={proposalNumberMap}
          acceptedProposalIds={acceptedProposalIds}
          rejectedProposalIds={rejectedProposalIds}
          blockedByConflictIds={blockedByConflictIds}
          blockedByAcceptedMap={blockedByAcceptedMap}
          userLookup={userLookup}
          showDiffPreviewToggle={isDescriptionDiff}
          showPreview={showPreview}
          onPreviewChange={setShowPreview}
          onSelectProposal={onSelectProposal}
          onPoolAccept={onPoolAccept}
          onPoolReject={onPoolReject}
          onUndoPool={onUndoPool}
          diffNavigation={{
            currentIndex,
            totalChanges,
            hasScroll,
            onNext: goToNext,
            onPrevious: goToPrevious,
            onScrollToCurrent: scrollToCurrent,
          }}
        />

        {/* Full artefact content with inline diff */}
        {selectedStandard && (
          <PMVStack gap={2} align="stretch">
            <PMText
              fontSize="lg"
              fontWeight="semibold"
              {...(isNameDiff && { 'data-diff-section': true })}
            >
              {isNameDiff
                ? renderDiffText(payload.oldValue, payload.newValue)
                : selectedStandard.name}
            </PMText>
            {renderMarkdownDiffOrPreview(
              isDescriptionDiff,
              showPreview,
              payload,
              selectedStandard.description,
              {
                previewPaddingVariant: 'none',
                defaultPaddingVariant: 'none',
              },
            )}

            {/* Rules Section */}
            {previewRules.length > 0 && (
              <PMVStack gap={2} align="stretch" marginTop={4}>
                <PMText fontSize="md" fontWeight="semibold">
                  Rules
                </PMText>
                {previewRules.map((rule) => {
                  const changeStatus = getRuleChangeStatus(rule);
                  const isDeleted = changeStatus === 'deleted';
                  const isAdded = changeStatus === 'added';
                  const isUpdated = changeStatus === 'updated';

                  // For updated rules, show diff between old and new values
                  const ruleContent = (() => {
                    if (
                      isUpdated &&
                      reviewingProposal.type === ChangeProposalType.updateRule
                    ) {
                      const payload =
                        reviewingProposal.payload as CollectionItemUpdatePayload<RuleId>;
                      return renderDiffText(payload.oldValue, payload.newValue);
                    }
                    return rule.content;
                  })();

                  return (
                    <PMBox key={rule.id} p={3} bg="background.tertiary">
                      <PMText fontSize="sm">
                        {isAdded ? (
                          <PMText
                            as="span"
                            bg="green.subtle"
                            paddingX={0.5}
                            borderRadius="sm"
                          >
                            {rule.content}
                          </PMText>
                        ) : isDeleted ? (
                          <PMText
                            as="span"
                            bg="red.subtle"
                            textDecoration="line-through"
                            paddingX={0.5}
                            borderRadius="sm"
                          >
                            {rule.content}
                          </PMText>
                        ) : (
                          ruleContent
                        )}
                      </PMText>
                    </PMBox>
                  );
                })}
              </PMVStack>
            )}
          </PMVStack>
        )}
      </PMVStack>
    );
  }

  if (!selectedStandard) {
    return (
      <PMBox
        display="flex"
        alignItems="center"
        justifyContent="center"
        height="full"
      >
        <PMText color="secondary">
          Select a proposal to preview the change
        </PMText>
      </PMBox>
    );
  }

  return (
    <PMVStack gap={2} align="stretch">
      {/* Render unified view when enabled */}
      {unifiedResult ? (
        <PMVStack gap={2} align="stretch" p={4}>
          {/* Standard Name */}
          {unifiedResult.changes.name ? (
            <HighlightedText
              oldValue={unifiedResult.changes.name.originalValue}
              newValue={unifiedResult.changes.name.finalValue}
              proposalNumbers={getProposalNumbers(
                unifiedResult.changes.name.proposalIds,
                selectedStandardProposals,
              )}
            >
              <PMText fontSize="lg" fontWeight="semibold">
                {unifiedResult.name}
              </PMText>
            </HighlightedText>
          ) : (
            <PMText fontSize="lg" fontWeight="semibold">
              {unifiedResult.name}
            </PMText>
          )}

          {/* Description */}
          {unifiedResult.changes.description ? (
            <UnifiedMarkdownViewer
              oldValue={unifiedResult.changes.description.originalValue}
              newValue={unifiedResult.changes.description.finalValue}
              proposalNumbers={getProposalNumbers(
                unifiedResult.changes.description.proposalIds,
                selectedStandardProposals,
              )}
            />
          ) : (
            <MarkdownEditorProvider>
              <MarkdownEditor
                defaultValue={unifiedResult.description}
                readOnly
                paddingVariant="none"
              />
            </MarkdownEditorProvider>
          )}

          {/* Rules Section */}
          {unifiedResult.rules.length > 0 && (
            <PMVStack gap={2} align="stretch" marginTop={4}>
              <PMText fontSize="md" fontWeight="semibold">
                Rules
              </PMText>
              {[...unifiedResult.rules]
                .sort((a, b) =>
                  a.content
                    .toLowerCase()
                    .localeCompare(b.content.toLowerCase()),
                )
                .map((rule) => {
                  const isAdded = unifiedResult.changes.rules.added.has(
                    rule.id,
                  );
                  const updateInfo = unifiedResult.changes.rules.updated.get(
                    rule.id,
                  );
                  const isDeleted = unifiedResult.changes.rules.deleted.has(
                    rule.id,
                  );

                  if (isAdded) {
                    const proposalId = unifiedResult.changes.rules.added.get(
                      rule.id,
                    );
                    const proposalNumbers = proposalId
                      ? getProposalNumbers(
                          [proposalId],
                          selectedStandardProposals,
                        )
                      : [];
                    return (
                      <HighlightedRuleBox
                        key={rule.id}
                        rule={rule}
                        changeType="added"
                        proposalNumbers={proposalNumbers}
                      />
                    );
                  }

                  if (updateInfo) {
                    return (
                      <HighlightedRuleBox
                        key={rule.id}
                        rule={rule}
                        changeType="updated"
                        oldContent={updateInfo.originalValue}
                        proposalNumbers={getProposalNumbers(
                          updateInfo.proposalIds,
                          selectedStandardProposals,
                        )}
                      />
                    );
                  }

                  if (isDeleted) {
                    // Note: Deleted rules are not in the final rules array
                    // This code path won't be hit, but kept for completeness
                    return (
                      <HighlightedRuleBox
                        key={rule.id}
                        rule={rule}
                        changeType="deleted"
                        proposalNumbers={[]}
                      />
                    );
                  }

                  // Unchanged rule
                  return (
                    <PMBox key={rule.id} p={3} bg="background.tertiary">
                      <PMText fontSize="sm">{rule.content}</PMText>
                    </PMBox>
                  );
                })}
            </PMVStack>
          )}
        </PMVStack>
      ) : (
        <PMVStack gap={2} align="stretch" p={4}>
          {/* Standard view (no unified view) */}
          <PMText fontSize="lg" fontWeight="semibold">
            {selectedStandard.name}
          </PMText>
          <MarkdownEditorProvider>
            <MarkdownEditor
              defaultValue={selectedStandard.description}
              readOnly
              paddingVariant="none"
            />
          </MarkdownEditorProvider>

          {/* Rules Section */}
          {rules.length > 0 && (
            <PMVStack gap={2} align="stretch" marginTop={4}>
              <PMText fontSize="md" fontWeight="semibold">
                Rules
              </PMText>
              {[...rules]
                .sort((a, b) =>
                  a.content
                    .toLowerCase()
                    .localeCompare(b.content.toLowerCase()),
                )
                .map((rule) => (
                  <PMBox key={rule.id} p={3} bg="background.tertiary">
                    <PMText fontSize="sm" color="primary">
                      {rule.content}
                    </PMText>
                  </PMBox>
                ))}
            </PMVStack>
          )}
        </PMVStack>
      )}
    </PMVStack>
  );
}
