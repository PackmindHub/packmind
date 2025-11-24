import React, { useState } from 'react';
import {
  PMBox,
  PMText,
  PMTimeline,
  PMTimelineItem,
  PMTimelineContent,
  PMTimelineSeparator,
  PMTimelineIndicator,
  PMTimelineConnector,
  PMTimelineTitle,
  PMTimelineDescription,
  PMButton,
  PMHStack,
  type PMTextColors,
  PMIcon,
  PMBadge,
} from '@packmind/ui';
import {
  DetectionProgram,
  RuleDetectionAssessmentStatus,
  DetectionStatus,
} from '@packmind/types';
import { useGetRuleDetectionAssessmentQuery } from '../../api/queries/DetectionProgramQueries';
import { ExecutionLogsDrawer } from '../ExecutionLogsDrawer';
import { ProgramContentDrawer } from '../ProgramContentDrawer';
import { LuCheck, LuCircleAlert, LuLoader } from 'react-icons/lu';

export enum DraftCardState {
  ASSESSING = 'assessing',
  ASSESSMENT_FAILED = 'assessment_failed',
  ASSESSMENT_SUCCESSFUL = 'assessment_successful',
  GENERATING = 'generating',
  GENERATION_FAILED = 'generation_failed',
  GENERATION_SUCCESSFUL = 'generation_successful',
}

export type DraftCardData = {
  id: string;
  language: string;
  activeDetectionProgramId: string;
  draftProgram: DetectionProgram;
  status: DetectionStatus | string;
  mode?: string;
  version?: number;
};

interface DraftCardProps {
  draft: DraftCardData;
  onMakeActive: (draft: DraftCardData) => void;
  isActivating?: boolean;
  onTestDraft: (draft: DraftCardData) => void;
  onRetryDraft?: (draft: DraftCardData) => void;
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
}) => {
  const [isLogsDrawerOpen, setIsLogsDrawerOpen] = useState(false);
  const [isProgramDrawerOpen, setIsProgramDrawerOpen] = useState(false);
  const { data: assessment } = useGetRuleDetectionAssessmentQuery(
    standardId,
    ruleId,
    draft.language,
  );

  const state = determineDraftCardState(assessment?.status, draft.status);
  const badgeConfig = getBadgeConfig(state);

  const timelineConfig = getTimelineConfig(
    state,
    {
      onShowLogs: () => setIsLogsDrawerOpen(true),
      onShowProgram: () => setIsProgramDrawerOpen(true),
      onTestDraft: () => onTestDraft(draft),
      onMakeActive: () => onMakeActive(draft),
      onRetryDraft: () => onRetryDraft?.(draft),
    },
    {
      isActivating: isActivating ?? false,
      isGenerating: isGenerating ?? false,
    },
  );

  return (
    <PMBox width="full" py={2} position="relative">
      <PMBox position="absolute" top={0} right={0}>
        <PMBadge colorPalette={badgeConfig.colorPalette}>
          {badgeConfig.label}
        </PMBadge>
      </PMBox>
      <PMTimeline variant="outline">
        <TimelineStep config={timelineConfig.step1} />
        <TimelineStep config={timelineConfig.step2} />
        <TimelineStep config={timelineConfig.step3} />
      </PMTimeline>
      <ExecutionLogsDrawer
        isOpen={isLogsDrawerOpen}
        onClose={() => setIsLogsDrawerOpen(false)}
        standardId={standardId}
        ruleId={ruleId}
        detectionProgramId={draft.draftProgram.id}
      />
      <ProgramContentDrawer
        isOpen={isProgramDrawerOpen}
        onClose={() => setIsProgramDrawerOpen(false)}
        programCode={draft.draftProgram.code}
      />
    </PMBox>
  );
};

function getStepIcon(status: TimelineStepStatus) {
  switch (status) {
    case TimelineStepStatus.failure:
      return (
        <PMIcon color="text.error" size="xs">
          <LuCircleAlert />
        </PMIcon>
      );
    case TimelineStepStatus.success:
      return (
        <PMIcon color="text.success" size="xs">
          <LuCheck />
        </PMIcon>
      );
    case TimelineStepStatus.pending:
      return (
        <PMIcon color="branding.primary" size="xs">
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
};

enum TimelineStepStatus {
  pending,
  success,
  failure,
  unreachable,
}

type TimelineStepConfig = {
  title: string;
  description?: string;
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

type BadgeConfig = {
  label: string;
  colorPalette: 'gray' | 'red' | 'green';
};

function getBadgeConfig(state: DraftCardState): BadgeConfig {
  switch (state) {
    case DraftCardState.ASSESSING:
    case DraftCardState.ASSESSMENT_SUCCESSFUL:
    case DraftCardState.GENERATING:
      return {
        label: 'Draft: pending',
        colorPalette: 'gray',
      };
    case DraftCardState.ASSESSMENT_FAILED:
    case DraftCardState.GENERATION_FAILED:
      return {
        label: 'Draft: failure',
        colorPalette: 'red',
      };
    case DraftCardState.GENERATION_SUCCESSFUL:
      return {
        label: 'Draft: OK',
        colorPalette: 'green',
      };
  }
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
                  size="sm"
                  variant="outline"
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

export function determineDraftCardState(
  assessmentStatus: RuleDetectionAssessmentStatus | undefined,
  draftStatus: DetectionStatus | string,
): DraftCardState {
  // If no assessment or assessment is running
  if (
    !assessmentStatus ||
    assessmentStatus === RuleDetectionAssessmentStatus.NOT_STARTED ||
    assessmentStatus === RuleDetectionAssessmentStatus.IN_PROGRESS
  ) {
    return DraftCardState.ASSESSING;
  }

  // If assessment failed
  if (assessmentStatus === RuleDetectionAssessmentStatus.FAILED) {
    return DraftCardState.ASSESSMENT_FAILED;
  }

  // If assessment succeeded
  if (assessmentStatus === RuleDetectionAssessmentStatus.SUCCESS) {
    // Check draft status
    if (draftStatus === DetectionStatus.IN_PROGRESS) {
      return DraftCardState.GENERATING;
    }

    if (
      draftStatus === DetectionStatus.FAILURE ||
      draftStatus === DetectionStatus.ERROR
    ) {
      return DraftCardState.GENERATION_FAILED;
    }

    if (draftStatus === DetectionStatus.READY) {
      return DraftCardState.GENERATION_SUCCESSFUL;
    }

    // Assessment successful but generation hasn't started or is in an intermediate state
    return DraftCardState.ASSESSMENT_SUCCESSFUL;
  }

  // Default fallback
  return DraftCardState.ASSESSING;
}

type LoadingStates = {
  isActivating: boolean;
  isGenerating: boolean;
};

function getTimelineConfig(
  state: DraftCardState,
  handlers: TimelineHandlers,
  loadingStates: LoadingStates,
): TimelineConfig {
  switch (state) {
    case DraftCardState.ASSESSING:
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

    case DraftCardState.ASSESSMENT_FAILED:
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

    case DraftCardState.ASSESSMENT_SUCCESSFUL:
      return {
        step1: {
          title: 'The rule can be detected',
          isLast: false,
          status: TimelineStepStatus.success,
        },
        step2: {
          title: 'Generating program',
          description:
            'Packmind AI generates a program that comply with rule specifications. Program is ran on code examples to ensure its validity',
          isLast: false,
          status: TimelineStepStatus.pending,
        },
        step3: {
          title: 'Ready to use',
          isLast: true,
          status: TimelineStepStatus.unreachable,
        },
      };

    case DraftCardState.GENERATING:
      return {
        step1: {
          title: 'The rule can be detected',
          isLast: false,
          status: TimelineStepStatus.success,
        },
        step2: {
          title: 'Generating program',
          description:
            'Packmind AI generates a program that comply with rule specifications. Program is ran on code examples to ensure its validity',
          isLast: false,
          status: TimelineStepStatus.pending,
          buttons: [
            {
              label: 'Show log',
              onClick: handlers.onShowLogs,
            },
          ],
        },
        step3: {
          title: 'Ready to use',
          isLast: true,
          status: TimelineStepStatus.unreachable,
        },
      };

    case DraftCardState.GENERATION_FAILED:
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
            },
          ],
        },
        step3: {
          title: 'Ready to use',
          isLast: true,
          status: TimelineStepStatus.unreachable,
        },
      };

    case DraftCardState.GENERATION_SUCCESSFUL:
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
            },
            {
              label: 'Show program',
              onClick: handlers.onShowProgram,
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
  }
}
