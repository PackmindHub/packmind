import React from 'react';
import { useGetRuleDetectionAssessmentQuery } from '@packmind/proprietary/frontend/domain/detection';
import { determineDraftStatus, DraftStatus } from './determineDraftStatus';
import {
  getTimelineConfig,
  LoadingStates,
  TimelineHandlers,
} from './getTimelineConfig';
import { DraftCardProps } from './DetectionDraftCard';
import { PMBox, PMMenu, PMPortal, PMIcon } from '@packmind/ui';
import { LuChevronDown } from 'react-icons/lu';

const getMenuLabel = (state: DraftStatus): string => {
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

const getColorPalette = (
  state: DraftStatus,
): 'green' | 'red' | 'blue' | 'gray' => {
  switch (state) {
    case DraftStatus.GENERATION_SUCCESSFUL:
      return 'green';
    case DraftStatus.ASSESSMENT_FAILED:
    case DraftStatus.GENERATION_FAILED:
      return 'red';
    default:
      return 'blue';
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

  const timelineConfig = getTimelineConfig(state, handlers, loadingStates);

  // Collect all buttons from all steps
  const allButtons = [
    ...(timelineConfig.step1.buttons ?? []),
    ...(timelineConfig.step2.buttons ?? []),
    ...(timelineConfig.step3.buttons ?? []),
  ];

  const menuLabel = getMenuLabel(state);
  const colorPalette = getColorPalette(state);

  return (
    <PMMenu.Root>
      <PMMenu.Trigger asChild>
        <PMBox
          as="span"
          backgroundColor={`${colorPalette}.solid`}
          color="white"
          px={2}
          py={0.5}
          borderRadius="full"
          fontSize="xs"
          fontWeight="small"
          cursor="pointer"
          display="inline-flex"
          alignItems="center"
          gap={0.5}
          _hover={{
            opacity: 0.9,
          }}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
          }}
        >
          {menuLabel}
          <PMIcon size="xs">
            <LuChevronDown />
          </PMIcon>
        </PMBox>
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
                  button.onClick();
                }}
              >
                {button.label}
              </PMMenu.Item>
            ))}
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
};
