import { useMemo, useState } from 'react';
import { PMBox, PMText, PMVStack } from '@packmind/ui';
import {
  ChangeProposalId,
  ChangeProposalType,
  CollectionItemAddPayload,
  CollectionItemDeletePayload,
  CollectionItemUpdatePayload,
  ScalarUpdatePayload,
  SkillFile,
  SkillFileId,
  SkillWithFiles,
  UserId,
} from '@packmind/types';
import {
  buildBlockedByAcceptedMap,
  buildProposalNumberMap,
} from '../../utils/changeProposalHelpers';
import { ChangeProposalWithConflicts } from '../../types';
import { ProposalReviewHeader } from '../ProposalReviewHeader';
import {
  SkillContentView,
  ProposalTypeFlags,
} from './SkillContent/SkillContentView';
import { useDiffNavigation } from '../../hooks/useDiffNavigation';

interface SkillProposalReviewPanelProps {
  selectedSkill: SkillWithFiles | undefined;
  selectedSkillProposals: ChangeProposalWithConflicts[];
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

export function SkillProposalReviewPanel({
  selectedSkill,
  selectedSkillProposals,
  reviewingProposalId,
  acceptedProposalIds,
  rejectedProposalIds,
  blockedByConflictIds,
  userLookup,
  onSelectProposal,
  onPoolAccept,
  onPoolReject,
  onUndoPool,
}: Readonly<SkillProposalReviewPanelProps>) {
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
    () => buildProposalNumberMap(selectedSkillProposals),
    [selectedSkillProposals],
  );

  const blockedByAcceptedMap = useMemo(
    () =>
      buildBlockedByAcceptedMap(selectedSkillProposals, acceptedProposalIds),
    [selectedSkillProposals, acceptedProposalIds],
  );

  const reviewingProposal = reviewingProposalId
    ? (selectedSkillProposals.find((p) => p.id === reviewingProposalId) ?? null)
    : null;

  const skill = selectedSkill?.skill;
  const files = selectedSkill?.files ?? [];

  if (reviewingProposal) {
    const isOutdated =
      skill !== undefined &&
      reviewingProposal.artefactVersion !== skill.version;

    const proposalTypeFlags: ProposalTypeFlags = {
      isNameDiff: reviewingProposal.type === ChangeProposalType.updateSkillName,
      isDescriptionDiff:
        reviewingProposal.type === ChangeProposalType.updateSkillDescription,
      isPromptDiff:
        reviewingProposal.type === ChangeProposalType.updateSkillPrompt,
      isMetadataDiff:
        reviewingProposal.type === ChangeProposalType.updateSkillMetadata,
      isLicenseDiff:
        reviewingProposal.type === ChangeProposalType.updateSkillLicense,
      isCompatibilityDiff:
        reviewingProposal.type === ChangeProposalType.updateSkillCompatibility,
      isAllowedToolsDiff:
        reviewingProposal.type === ChangeProposalType.updateSkillAllowedTools,
      isAddFile: reviewingProposal.type === ChangeProposalType.addSkillFile,
      isUpdateFileContent:
        reviewingProposal.type === ChangeProposalType.updateSkillFileContent,
      isUpdateFilePermissions:
        reviewingProposal.type ===
        ChangeProposalType.updateSkillFilePermissions,
      isDeleteFile:
        reviewingProposal.type === ChangeProposalType.deleteSkillFile,
    };

    const {
      isDescriptionDiff,
      isPromptDiff,
      isAddFile,
      isUpdateFileContent,
      isUpdateFilePermissions,
      isDeleteFile,
    } = proposalTypeFlags;

    const isMarkdownDiff = isDescriptionDiff || isPromptDiff;
    const scalarPayload = reviewingProposal.payload as ScalarUpdatePayload;

    const targetFileId = (() => {
      if (isUpdateFileContent || isUpdateFilePermissions) {
        return (
          reviewingProposal.payload as CollectionItemUpdatePayload<SkillFileId>
        ).targetId;
      }
      if (isDeleteFile) {
        return (
          reviewingProposal.payload as CollectionItemDeletePayload<
            Omit<SkillFile, 'skillVersionId'>
          >
        ).targetId;
      }
      if (isAddFile) {
        return (
          reviewingProposal.payload as CollectionItemAddPayload<
            Omit<SkillFile, 'skillVersionId'>
          >
        ).item.id;
      }
      return undefined;
    })();

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
          showDiffPreviewToggle={isMarkdownDiff}
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
        {skill && (
          <PMBox px={4} pb={4}>
            <SkillContentView
              skill={skill}
              files={files}
              proposalTypeFlags={proposalTypeFlags}
              scalarPayload={scalarPayload}
              reviewingProposal={reviewingProposal}
              showPreview={showPreview}
              targetFileId={targetFileId}
            />
          </PMBox>
        )}
      </PMVStack>
    );
  }

  if (!selectedSkill || !skill) {
    return (
      <PMBox
        display="flex"
        alignItems="center"
        justifyContent="center"
        height="full"
        p={4}
      >
        <PMText color="secondary">
          Select a proposal to preview the change
        </PMText>
      </PMBox>
    );
  }

  // Read-only full skill view (no proposal selected)
  return (
    <PMBox p={4}>
      <SkillContentView skill={skill} files={files} showPreview={false} />
    </PMBox>
  );
}
