import React from 'react';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMText,
  type PMTextColors,
  PMTimeline,
  PMTimelineConnector,
  PMTimelineContent,
  PMTimelineDescription,
  PMTimelineIndicator,
  PMTimelineItem,
  PMTimelineSeparator,
  PMTimelineTitle,
} from '@packmind/ui';
import { DetectionProgram, DetectionStatus } from '@packmind/types';
import { useGetRuleDetectionAssessmentQuery } from '../../api/queries/DetectionProgramQueries';
import { LuCheck, LuCircleAlert, LuLoader } from 'react-icons/lu';
import { determineDraftStatus } from './determineDraftStatus';
import {
  getTimelineConfig,
  LoadingStates,
  TimelineHandlers,
  TimelineStepConfig,
  TimelineStepStatus,
} from './getTimelineConfig';

export type DraftCardData = {
  id: string;
  language: string;
  activeDetectionProgramId: string;
  draftProgram: DetectionProgram;
  status: DetectionStatus | string;
  mode?: string;
  version?: number;
};

export interface DraftCardProps {
  draft: DraftCardData;
  onMakeActive: (draft: DraftCardData) => void;
  isActivating?: boolean;
  onTestDraft: (draft: DraftCardData) => void;
  onRetryDraft?: (draft: DraftCardData) => void;
  onShowLogs: () => void;
  onShowProgram: () => void;
  isGenerating?: boolean;
  standardId: string;
  ruleId: string;
}

export const DetectionDraftCard: React.FC<DraftCardProps> = ({
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
    onShowLogs: () => onShowLogs(),
    onShowProgram: () => onShowProgram(),
    onTestDraft: () => onTestDraft(draft),
    onMakeActive: () => onMakeActive(draft),
    onRetryDraft: () => onRetryDraft?.(draft),
  };

  const loadingStates: LoadingStates = {
    isActivating: isActivating ?? false,
    isGenerating: isGenerating ?? false,
  };

  const timelineConfig = getTimelineConfig(state, handlers, loadingStates);

  return (
    <PMBox width="full" m={4}>
      <PMTimeline variant="subtle">
        <TimelineStep config={timelineConfig.step1} />
        <TimelineStep config={timelineConfig.step2} />
        <TimelineStep config={timelineConfig.step3} />
      </PMTimeline>
    </PMBox>
  );
};

function getStepIcon(status: TimelineStepStatus) {
  switch (status) {
    case TimelineStepStatus.failure:
      return (
        <PMIcon bgColor={'colorPalette.primary'} color="text.error" size="xs">
          <LuCircleAlert />
        </PMIcon>
      );
    case TimelineStepStatus.success:
      return (
        <PMIcon bgColor={'colorPalette.primary'} color="text.success" size="xs">
          <LuCheck />
        </PMIcon>
      );
    case TimelineStepStatus.pending:
      return (
        <PMIcon
          color="branding.primary"
          size="xs"
          animation="spin 1500ms linear infinite"
        >
          <LuLoader />
        </PMIcon>
      );
    default:
      return;
  }
}

function getStepTextColor(status: TimelineStepStatus): PMTextColors {
  if (status === TimelineStepStatus.unreachable) return 'faded';

  return 'primary';
}

interface TimelineStepProps {
  config: TimelineStepConfig;
}

const TimelineStep: React.FC<TimelineStepProps> = ({ config }) => {
  return (
    <PMTimelineItem>
      <PMTimelineConnector>
        {!config.isLast && <PMTimelineSeparator />}
        <PMTimelineIndicator icon={getStepIcon(config.status)} />
      </PMTimelineConnector>
      <PMTimelineContent>
        <PMTimelineTitle>
          <PMText color={getStepTextColor(config.status)}>
            {config.title}
          </PMText>
        </PMTimelineTitle>
        {config.description && (
          <PMTimelineDescription>{config.description}</PMTimelineDescription>
        )}
        {config.buttons && config.buttons.length > 0 && (
          <PMBox mt={2}>
            <PMHStack gap={2}>
              {config.buttons.map((button) => (
                <PMButton
                  key={button.label}
                  size={button?.size ?? 'sm'}
                  variant={button?.variant ?? 'outline'}
                  onClick={button.onClick}
                  disabled={button.disabled}
                >
                  {button.label}
                </PMButton>
              ))}
            </PMHStack>
          </PMBox>
        )}
      </PMTimelineContent>
    </PMTimelineItem>
  );
};
