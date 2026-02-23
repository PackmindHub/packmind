import { useMemo, useState } from 'react';
import { PMBox, PMMarkdownViewer, PMText, PMVStack } from '@packmind/ui';
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
import { buildDiffHtml, markdownDiffCss } from '../../utils/markdownDiff';
import {
  MarkdownEditor,
  MarkdownEditorProvider,
} from '../../../../shared/components/editor/MarkdownEditor';
import { renderDiffText } from '../../utils/renderDiffText';
import { ProposalReviewHeader } from '../ProposalReviewHeader';

interface ProposalReviewPanelProps {
  selectedStandard: Standard | undefined;
  selectedStandardProposals: ChangeProposalWithConflicts[];
  rules: Rule[];
  reviewingProposalId: ChangeProposalId | null;
  acceptedProposalIds: Set<ChangeProposalId>;
  rejectedProposalIds: Set<ChangeProposalId>;
  blockedByConflictIds: Set<ChangeProposalId>;
  userLookup: Map<UserId, string>;
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
  acceptedProposalIds,
  rejectedProposalIds,
  blockedByConflictIds,
  userLookup,
  onSelectProposal,
  onPoolAccept,
  onPoolReject,
  onUndoPool,
}: Readonly<ProposalReviewPanelProps>) {
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

  // Compute preview rules when a rule change proposal is selected
  const previewRules = useMemo(() => {
    if (!reviewingProposal) return rules;

    const proposalType = reviewingProposal.type;

    if (proposalType === ChangeProposalType.addRule) {
      const payload = reviewingProposal.payload as CollectionItemAddPayload<
        Omit<Rule, 'id' | 'standardVersionId'>
      >;
      // Add the new rule at the end (use first rule's versionId or empty string)
      const standardVersionId =
        rules.length > 0
          ? rules[0].standardVersionId
          : ('' as StandardVersionId);
      return [
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
      return rules.map((rule) =>
        rule.id === payload.targetId
          ? { ...rule, content: payload.newValue }
          : rule,
      );
    }

    if (proposalType === ChangeProposalType.deleteRule) {
      const payload = reviewingProposal.payload as CollectionItemDeletePayload<
        Omit<Rule, 'standardVersionId'>
      >;
      return rules.filter((rule) => rule.id !== payload.targetId);
    }

    return rules;
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
    const isOutdated =
      selectedStandard !== undefined &&
      reviewingProposal.artefactVersion !== selectedStandard.version;

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
        />

        {/* Full artefact content with inline diff */}
        {selectedStandard && (
          <PMVStack gap={2} align="stretch">
            <PMText fontSize="lg" fontWeight="semibold">
              {isNameDiff
                ? renderDiffText(payload.oldValue, payload.newValue)
                : selectedStandard.name}
            </PMText>
            {isDescriptionDiff && !showPreview ? (
              <PMBox padding="60px 68px" css={markdownDiffCss}>
                <PMMarkdownViewer
                  htmlContent={buildDiffHtml(
                    payload.oldValue,
                    payload.newValue,
                  )}
                />
              </PMBox>
            ) : isDescriptionDiff && showPreview ? (
              <MarkdownEditorProvider>
                <MarkdownEditor defaultValue={payload.newValue} readOnly />
              </MarkdownEditorProvider>
            ) : (
              <MarkdownEditorProvider>
                <MarkdownEditor
                  defaultValue={selectedStandard.description}
                  readOnly
                />
              </MarkdownEditorProvider>
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
      <PMText fontSize="lg" fontWeight="semibold">
        {selectedStandard.name}
      </PMText>
      <MarkdownEditorProvider>
        <MarkdownEditor defaultValue={selectedStandard.description} readOnly />
      </MarkdownEditorProvider>

      {/* Rules Section */}
      {rules.length > 0 && (
        <PMVStack gap={2} align="stretch" marginTop={4}>
          <PMText fontSize="md" fontWeight="semibold">
            Rules
          </PMText>
          {rules.map((rule) => (
            <PMBox key={rule.id} p={3} bg="background.tertiary">
              <PMText fontSize="sm" color="primary">
                {rule.content}
              </PMText>
            </PMBox>
          ))}
        </PMVStack>
      )}
    </PMVStack>
  );
}
