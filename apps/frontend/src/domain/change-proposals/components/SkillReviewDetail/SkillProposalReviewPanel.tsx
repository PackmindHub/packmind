import { useMemo, useState } from 'react';
import {
  PMAccordion,
  PMBox,
  PMHStack,
  PMIcon,
  PMSwitch,
  PMText,
  PMTooltip,
  PMVStack,
} from '@packmind/ui';
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
import { LuInfo } from 'react-icons/lu';
import {
  buildBlockedByAcceptedMap,
  buildProposalNumberMap,
} from '../../utils/changeProposalHelpers';
import { ChangeProposalWithConflicts } from '../../types';
import {
  MarkdownEditor,
  MarkdownEditorProvider,
} from '../../../../shared/components/editor/MarkdownEditor';
import { applySkillProposals } from '../../utils/applySkillProposals';
import { getProposalNumbers } from '../../utils/applyStandardProposals';
import { HighlightedText } from '../HighlightedContent';
import { UnifiedMarkdownViewer } from '../UnifiedMarkdownViewer';
import { ProposalReviewHeader } from '../ProposalReviewHeader';
import {
  SkillContentView,
  ProposalTypeFlags,
} from './SkillContent/SkillContentView';
import { SkillOptionalField } from './SkillContent/SkillOptionalField';
import { MetadataKeyValueDisplay } from './SkillContent/MetadataKeyValueDisplay';
import { FileAccordionItem } from './FileItems/FileAccordionItem';
import { useDiffNavigation } from '../../hooks/useDiffNavigation';

interface SkillProposalReviewPanelProps {
  selectedSkill: SkillWithFiles | undefined;
  selectedSkillProposals: ChangeProposalWithConflicts[];
  reviewingProposalId: ChangeProposalId | null;
  outdatedProposalIds: Set<ChangeProposalId>;
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
  outdatedProposalIds,
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
  const [showUnifiedView, setShowUnifiedView] = useState(false);

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

  // Compute unified preview when enabled
  const unifiedResult = useMemo(() => {
    if (
      !showUnifiedView ||
      !skill ||
      acceptedProposalIds.size === 0 ||
      reviewingProposal
    ) {
      return null;
    }
    return applySkillProposals(
      skill,
      files,
      selectedSkillProposals,
      acceptedProposalIds,
    );
  }, [
    showUnifiedView,
    skill,
    files,
    selectedSkillProposals,
    acceptedProposalIds,
    reviewingProposal,
  ]);

  if (reviewingProposal) {
    const isOutdated = outdatedProposalIds.has(reviewingProposal.id);

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
            Omit<SkillFile, 'id' | 'skillVersionId'>
          >
        ).item.path;
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
    <PMVStack gap={2} align="stretch" p={4}>
      {/* Unified View Toggle - only show when there are accepted proposals */}
      {acceptedProposalIds.size > 0 && !reviewingProposal && (
        <PMHStack
          gap={2}
          alignItems="center"
          p={3}
          bg="background.secondary"
          borderRadius="md"
        >
          <PMSwitch
            size="sm"
            checked={showUnifiedView}
            onCheckedChange={(e) => setShowUnifiedView(e.checked)}
          />
          <PMText fontSize="sm">
            Unified View ({acceptedProposalIds.size} accepted change
            {acceptedProposalIds.size > 1 ? 's' : ''})
          </PMText>
          <PMTooltip
            label="Preview how the skill will look after applying all accepted proposals"
            placement="top"
          >
            <PMIcon color="text.tertiary">
              <LuInfo />
            </PMIcon>
          </PMTooltip>
        </PMHStack>
      )}

      {/* Render unified view when enabled */}
      {unifiedResult ? (
        <UnifiedSkillView
          unifiedResult={unifiedResult}
          proposals={selectedSkillProposals}
          files={files}
        />
      ) : (
        <SkillContentView skill={skill} files={files} showPreview={false} />
      )}
    </PMVStack>
  );
}

function UnifiedSkillView({
  unifiedResult,
  proposals,
  files,
}: {
  unifiedResult: NonNullable<ReturnType<typeof applySkillProposals>>;
  proposals: ChangeProposalWithConflicts[];
  files: SkillFile[];
}) {
  const [openFileIds, setOpenFileIds] = useState<string[]>([]);

  return (
    <PMVStack gap={4} align="stretch">
      {/* Skill Name */}
      {unifiedResult.changes.name ? (
        <HighlightedText
          oldValue={unifiedResult.changes.name.originalValue}
          newValue={unifiedResult.changes.name.finalValue}
          proposalNumbers={getProposalNumbers(
            unifiedResult.changes.name.proposalIds,
            proposals,
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
            proposals,
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

      {/* License (optional) */}
      {unifiedResult.license && (
        <SkillOptionalField label="License">
          {unifiedResult.changes.license ? (
            <HighlightedText
              oldValue={unifiedResult.changes.license.originalValue}
              newValue={unifiedResult.changes.license.finalValue}
              proposalNumbers={getProposalNumbers(
                unifiedResult.changes.license.proposalIds,
                proposals,
              )}
            >
              <PMText>{unifiedResult.license}</PMText>
            </HighlightedText>
          ) : (
            <PMText>{unifiedResult.license}</PMText>
          )}
        </SkillOptionalField>
      )}

      {/* Compatibility (optional) */}
      {unifiedResult.compatibility && (
        <SkillOptionalField label="Compatibility">
          {unifiedResult.changes.compatibility ? (
            <HighlightedText
              oldValue={unifiedResult.changes.compatibility.originalValue}
              newValue={unifiedResult.changes.compatibility.finalValue}
              proposalNumbers={getProposalNumbers(
                unifiedResult.changes.compatibility.proposalIds,
                proposals,
              )}
            >
              <PMText>{unifiedResult.compatibility}</PMText>
            </HighlightedText>
          ) : (
            <PMText>{unifiedResult.compatibility}</PMText>
          )}
        </SkillOptionalField>
      )}

      {/* Allowed Tools (optional) */}
      {unifiedResult.allowedTools && (
        <SkillOptionalField label="Allowed Tools">
          {unifiedResult.changes.allowedTools ? (
            <HighlightedText
              oldValue={unifiedResult.changes.allowedTools.originalValue}
              newValue={unifiedResult.changes.allowedTools.finalValue}
              proposalNumbers={getProposalNumbers(
                unifiedResult.changes.allowedTools.proposalIds,
                proposals,
              )}
            >
              <PMText>{unifiedResult.allowedTools}</PMText>
            </HighlightedText>
          ) : (
            <PMText>{unifiedResult.allowedTools}</PMText>
          )}
        </SkillOptionalField>
      )}

      {/* Metadata (optional) */}
      {unifiedResult.metadata && (
        <SkillOptionalField label="Metadata">
          {unifiedResult.changes.metadata ? (
            <PMTooltip
              label={`Changed by proposal${
                getProposalNumbers(
                  unifiedResult.changes.metadata.proposalIds,
                  proposals,
                ).length > 1
                  ? 's'
                  : ''
              } #${getProposalNumbers(
                unifiedResult.changes.metadata.proposalIds,
                proposals,
              ).join(', #')}`}
              placement="top"
            >
              <PMBox
                bg="yellow.subtle"
                borderBottom="2px dotted"
                borderColor="yellow.emphasis"
                cursor="help"
                display="inline-block"
                p={1}
                borderRadius="sm"
              >
                <MetadataKeyValueDisplay metadata={unifiedResult.metadata} />
              </PMBox>
            </PMTooltip>
          ) : (
            <MetadataKeyValueDisplay metadata={unifiedResult.metadata} />
          )}
        </SkillOptionalField>
      )}

      {/* SKILL.md section */}
      <PMAccordion.Root collapsible multiple defaultValue={['SKILL.md']}>
        <PMAccordion.Item
          value="SKILL.md"
          borderRadius="md"
          border="1px solid"
          borderColor="border.primary"
        >
          <PMAccordion.ItemTrigger
            cursor="pointer"
            bg="background.primary"
            px={2}
          >
            <PMAccordion.ItemIndicator />
            <PMText fontSize="sm" fontWeight="semibold">
              SKILL.md
            </PMText>
          </PMAccordion.ItemTrigger>
          <PMAccordion.ItemContent padding={4}>
            {unifiedResult.changes.prompt ? (
              <UnifiedMarkdownViewer
                oldValue={unifiedResult.changes.prompt.originalValue}
                newValue={unifiedResult.changes.prompt.finalValue}
                proposalNumbers={getProposalNumbers(
                  unifiedResult.changes.prompt.proposalIds,
                  proposals,
                )}
              />
            ) : (
              <MarkdownEditorProvider>
                <MarkdownEditor
                  defaultValue={unifiedResult.prompt}
                  readOnly
                  paddingVariant="none"
                />
              </MarkdownEditorProvider>
            )}
          </PMAccordion.ItemContent>
        </PMAccordion.Item>
      </PMAccordion.Root>

      {/* Files section */}
      {unifiedResult.files.length > 0 && (
        <PMVStack gap={2}>
          <PMText
            fontSize="sm"
            fontWeight="bold"
            color="secondary"
            width="full"
          >
            Files
          </PMText>
          <PMAccordion.Root
            collapsible
            multiple
            value={openFileIds}
            onValueChange={(details) => setOpenFileIds(details.value)}
            spaceY={2}
          >
            {unifiedResult.files.map((file) => {
              const isAdded = unifiedResult.changes.files.added.has(file.path);
              return (
                <FileAccordionItem
                  key={file.id || file.path}
                  file={file}
                  variant={isAdded ? 'added' : 'default'}
                  accordionValue={file.id || file.path}
                />
              );
            })}
          </PMAccordion.Root>
        </PMVStack>
      )}
    </PMVStack>
  );
}
