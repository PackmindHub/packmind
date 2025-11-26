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
  type IPMButtonProps,
} from '@packmind/ui';
import { DetectionProgram, DetectionStatus } from '@packmind/types';
import { useGetRuleDetectionAssessmentQuery } from '../../api/queries/DetectionProgramQueries';
import { LuCheck, LuCircleAlert, LuLoader } from 'react-icons/lu';
import {
  determineDraftStatus,
  DraftStatus,
} from '@packmind/proprietary/frontend/domain/detection/components/DetectionDraftCard/determineDraftStatus';

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
    <PMBox width="full">
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

type TimelineButton = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: IPMButtonProps['variant'];
  size?: IPMButtonProps['size'];
};

enum TimelineStepStatus {
  pending,
  success,
  failure,
  unreachable,
}

type TimelineStepConfig = {
  title: string;
  description?: string | React.ReactNode;
  isLast: boolean;
  buttons?: TimelineButton[];
  status: TimelineStepStatus;
};

type TimelineConfig = {
  step1: TimelineStepConfig;
  step2: TimelineStepConfig;
  step3: TimelineStepConfig;
};

type TimelineHandlers = {
  onShowLogs: () => void;
  onShowProgram: () => void;
  onTestDraft: () => void;
  onMakeActive: () => void;
  onRetryDraft: () => void;
};

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

type LoadingStates = {
  isActivating: boolean;
  isGenerating: boolean;
};

function getTimelineConfig(
  state: DraftStatus,
  handlers: TimelineHandlers,
  loadingStates: LoadingStates,
): TimelineConfig {
  switch (state) {
    case DraftStatus.ASSESSING:
      return {
        step1: {
          title: 'Checking the detectability of the rule',
          isLast: false,
          status: TimelineStepStatus.pending,
        },
        step2: {
          title: 'Generating program',
          isLast: false,
          status: TimelineStepStatus.unreachable,
        },
        step3: {
          title: 'Ready to use',
          isLast: true,
          status: TimelineStepStatus.unreachable,
        },
      };

    case DraftStatus.ASSESSMENT_FAILED:
      return {
        step1: {
          title: 'The rule can not be detected',
          isLast: false,
          status: TimelineStepStatus.failure,
        },
        step2: {
          title: 'Generating program',
          isLast: false,
          status: TimelineStepStatus.unreachable,
        },
        step3: {
          title: 'Ready to use',
          isLast: true,
          status: TimelineStepStatus.unreachable,
        },
      };

    case DraftStatus.ASSESSMENT_SUCCESSFUL:
      return {
        step1: {
          title: 'The rule can be detected',
          isLast: false,
          status: TimelineStepStatus.success,
        },
        step2: {
          title: 'Generating program',
          description: (
            <>
              <PMText as="p" variant="small">
                Packmind AI generates a program that comply with rule
                specifications. Program is ran on code examples to ensure its
                validity.
              </PMText>
              <PMText as="p" color="faded" variant="small">
                Note: generation can take more than a minute to finish.
              </PMText>
            </>
          ),
          isLast: false,
          status: TimelineStepStatus.pending,
        },
        step3: {
          title: 'Ready to use',
          isLast: true,
          status: TimelineStepStatus.unreachable,
        },
      };

    case DraftStatus.GENERATING:
      return {
        step1: {
          title: 'The rule can be detected',
          isLast: false,
          status: TimelineStepStatus.success,
        },
        step2: {
          title: 'Generating program',
          description: (
            <>
              <PMText as="p" variant="small">
                Packmind AI generates a program that comply with rule
                specifications. Program is ran on code examples to ensure its
                validity.
              </PMText>
              <PMText as="p" color="faded" variant="small">
                Note: generation can take more than a minute to finish.
              </PMText>
            </>
          ),
          isLast: false,
          status: TimelineStepStatus.pending,
          buttons: [
            {
              label: 'Show log',
              onClick: handlers.onShowLogs,
              variant: 'tertiary',
              size: '2xs',
            },
          ],
        },
        step3: {
          title: 'Ready to use',
          isLast: true,
          status: TimelineStepStatus.unreachable,
        },
      };

    case DraftStatus.GENERATION_FAILED:
      return {
        step1: {
          title: 'The rule can be detected',
          isLast: false,
          status: TimelineStepStatus.success,
        },
        step2: {
          title: 'Unable to generate a program',
          isLast: false,
          status: TimelineStepStatus.failure,
          buttons: [
            {
              label: 'Retry',
              onClick: handlers.onRetryDraft,
              disabled: loadingStates.isGenerating,
            },
            {
              label: 'Show log',
              onClick: handlers.onShowLogs,
              variant: 'tertiary',
              size: '2xs',
            },
          ],
        },
        step3: {
          title: 'Ready to use',
          isLast: true,
          status: TimelineStepStatus.unreachable,
        },
      };

    case DraftStatus.GENERATION_SUCCESSFUL:
      return {
        step1: {
          title: 'The rule can be detected',
          isLast: false,
          status: TimelineStepStatus.success,
        },
        step2: {
          title: 'Program has been generated',
          isLast: false,
          status: TimelineStepStatus.success,
          buttons: [
            {
              label: 'Show log',
              onClick: handlers.onShowLogs,
              variant: 'tertiary',
              size: '2xs',
            },
            {
              label: 'Show program',
              onClick: handlers.onShowProgram,
              variant: 'tertiary',
              size: '2xs',
            },
          ],
        },
        step3: {
          title: 'Ready to use',
          isLast: true,
          status: TimelineStepStatus.success,
          buttons: [
            {
              label: 'Test draft program',
              onClick: handlers.onTestDraft,
            },
            {
              label: 'Set as active',
              onClick: handlers.onMakeActive,
              disabled: loadingStates.isActivating,
            },
          ],
        },
      };

    default: {
      const _exhaustiveCheck: never = state;
      throw new Error(`Unhandled DraftStatus: ${_exhaustiveCheck}`);
    }
  }
}
