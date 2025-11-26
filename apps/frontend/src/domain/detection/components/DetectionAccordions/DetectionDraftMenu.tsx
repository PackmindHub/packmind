import React, { useState } from 'react';
import { useGetRuleDetectionAssessmentQuery } from '../../api/queries/DetectionProgramQueries';
import {
  determineDraftStatus,
  DraftStatus,
} from '../DetectionDraftCard/determineDraftStatus';
import {
  DraftInfo,
  getTimelineConfig,
  LoadingStates,
  TimelineHandlers,
} from '../DetectionDraftCard/getTimelineConfig';
import { DraftCardProps } from '../DetectionDraftCard/DetectionDraftCard';
import {
  PMMenu,
  PMPortal,
  PMIcon,
  PMButton,
  PMAlertDialog,
} from '@packmind/ui';
import { LuChevronDown } from 'react-icons/lu';

export const getMenuLabel = (state: DraftStatus): string => {
  switch (state) {
    case DraftStatus.GENERATION_SUCCESSFUL:
      return 'Draft: OK';
    case DraftStatus.ASSESSMENT_FAILED:
    case DraftStatus.GENERATION_FAILED:
      return 'Draft: Error';
    default:
      return 'Draft: Pending';
  }
};

const getButtonVariant = (
  state: DraftStatus,
): 'success' | 'danger' | 'tertiary' => {
  switch (state) {
    case DraftStatus.GENERATION_SUCCESSFUL:
      return 'success';
    case DraftStatus.ASSESSMENT_FAILED:
    case DraftStatus.GENERATION_FAILED:
      return 'danger';
    default:
      return 'tertiary';
  }
};

export const DetectionDraftMenu: React.FC<DraftCardProps> = ({
  draft,
  onMakeActive,
  isActivating,
  onTestDraft,
  onRetryDraft,
  isGenerating,
  standardId,
  ruleId,
  onShowLogs,
  onShowProgram,
}) => {
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
  } | null>(null);

  const { data: assessment } = useGetRuleDetectionAssessmentQuery(
    standardId,
    ruleId,
    draft.language,
  );
  const state = determineDraftStatus(assessment?.status, draft.status);

  const handlers: TimelineHandlers = {
    onShowLogs,
    onShowProgram,
    onTestDraft: () => onTestDraft(draft),
    onMakeActive: () => onMakeActive(draft),
    onRetryDraft: () => onRetryDraft?.(draft),
  };

  const loadingStates: LoadingStates = {
    isActivating: isActivating ?? false,
    isGenerating: isGenerating ?? false,
  };

  const draftInfo: DraftInfo = {
    language: draft.language,
    version: draft.version,
    hasActiveProgram: !!draft.activeDetectionProgramId,
  };

  const timelineConfig = getTimelineConfig(
    state,
    handlers,
    loadingStates,
    draftInfo,
  );

  // Collect all buttons from all steps
  const allButtons = [
    ...(timelineConfig.step1.buttons ?? []),
    ...(timelineConfig.step2.buttons ?? []),
    ...(timelineConfig.step3.buttons ?? []),
  ];

  const handleButtonClick = (button: (typeof allButtons)[number]) => {
    if (button.confirmation) {
      setConfirmationDialog({
        isOpen: true,
        title: button.confirmation.title,
        message: button.confirmation.message,
        confirmText: button.confirmation.confirmText ?? 'Confirm',
        onConfirm: () => {
          button.onClick();
          setConfirmationDialog(null);
        },
      });
    } else {
      button.onClick();
    }
  };

  return (
    <>
      <PMMenu.Root>
        <PMMenu.Trigger asChild>
          <PMButton
            size="2xs"
            variant={getButtonVariant(state)}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
            }}
          >
            {getMenuLabel(state)}
            <PMIcon size="xs">
              <LuChevronDown />
            </PMIcon>
          </PMButton>
        </PMMenu.Trigger>
        <PMPortal>
          <PMMenu.Positioner>
            <PMMenu.Content>
              {allButtons.map((button, index) => (
                <PMMenu.Item
                  key={index}
                  value={button.label}
                  cursor="pointer"
                  disabled={button.disabled}
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleButtonClick(button);
                  }}
                >
                  {button.icon && (
                    <PMIcon size="sm" mr={2}>
                      {button.icon}
                    </PMIcon>
                  )}
                  {button.label}
                </PMMenu.Item>
              ))}
            </PMMenu.Content>
          </PMMenu.Positioner>
        </PMPortal>
      </PMMenu.Root>
      {confirmationDialog && (
        <PMAlertDialog
          title={confirmationDialog.title}
          message={confirmationDialog.message}
          confirmText={confirmationDialog.confirmText}
          confirmColorScheme="blue"
          onConfirm={confirmationDialog.onConfirm}
          open={confirmationDialog.isOpen}
          onOpenChange={({ open }) => {
            if (!open) {
              setConfirmationDialog(null);
            }
          }}
        />
      )}
    </>
  );
};
