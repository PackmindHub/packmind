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
} from '@packmind/ui';
import {
  DetectionProgram,
  RuleDetectionAssessmentStatus,
  DetectionStatus,
} from '@packmind/types';
import { useGetRuleDetectionAssessmentQuery } from '@packmind/proprietary/frontend/domain/detection';
import { ExecutionLogsDrawer } from '../ExecutionLogsDrawer';
import { ProgramContentDrawer } from '../ProgramContentDrawer';

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
  onTestDraft,
  onRetryDraft,
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

  const timelineConfig = getTimelineConfig(state, {
    onShowLogs: () => setIsLogsDrawerOpen(true),
    onShowProgram: () => setIsProgramDrawerOpen(true),
    onTestDraft: () => onTestDraft(draft),
    onMakeActive: () => onMakeActive(draft),
    onRetryDraft: () => onRetryDraft?.(draft),
  });

  return (
    <PMBox width="full" py={2}>
      <PMTimeline variant="outline">
        {/* Step 1: Assessment */}
        <PMTimelineItem>
          <PMTimelineSeparator>
            <PMTimelineIndicator />
            {!timelineConfig.step1.isLast && <PMTimelineConnector />}
          </PMTimelineSeparator>
          <PMTimelineContent>
            <PMTimelineTitle>
              <PMText color={timelineConfig.step1.color}>
                {timelineConfig.step1.title}
              </PMText>
            </PMTimelineTitle>
            {timelineConfig.step1.description && (
              <PMTimelineDescription>
                {timelineConfig.step1.description}
              </PMTimelineDescription>
            )}
          </PMTimelineContent>
        </PMTimelineItem>

        {/* Step 2: Generation */}
        <PMTimelineItem>
          <PMTimelineSeparator>
            <PMTimelineIndicator />
            {!timelineConfig.step2.isLast && <PMTimelineConnector />}
          </PMTimelineSeparator>
          <PMTimelineContent>
            <PMTimelineTitle>
              <PMText color={timelineConfig.step2.color}>
                {timelineConfig.step2.title}
              </PMText>
            </PMTimelineTitle>
            {timelineConfig.step2.description && (
              <PMTimelineDescription>
                {timelineConfig.step2.description}
              </PMTimelineDescription>
            )}
            {timelineConfig.step2.buttons &&
              timelineConfig.step2.buttons.length > 0 && (
                <PMBox mt={2}>
                  <PMHStack gap={2}>
                    {timelineConfig.step2.buttons.map((button) => (
                      <PMButton
                        key={button.label}
                        size="sm"
                        variant="outline"
                        onClick={button.onClick}
                      >
                        {button.label}
                      </PMButton>
                    ))}
                  </PMHStack>
                </PMBox>
              )}
          </PMTimelineContent>
        </PMTimelineItem>

        {/* Step 3: Ready */}
        <PMTimelineItem>
          <PMTimelineSeparator>
            <PMTimelineIndicator />
          </PMTimelineSeparator>
          <PMTimelineContent>
            <PMTimelineTitle>
              <PMText color={timelineConfig.step3.color}>
                {timelineConfig.step3.title}
              </PMText>
            </PMTimelineTitle>
            {timelineConfig.step3.description && (
              <PMTimelineDescription>
                {timelineConfig.step3.description}
              </PMTimelineDescription>
            )}
            {timelineConfig.step3.buttons &&
              timelineConfig.step3.buttons.length > 0 && (
                <PMBox mt={2}>
                  <PMHStack gap={2}>
                    {timelineConfig.step3.buttons.map((button) => (
                      <PMButton
                        key={button.label}
                        size="sm"
                        variant="outline"
                        onClick={button.onClick}
                      >
                        {button.label}
                      </PMButton>
                    ))}
                  </PMHStack>
                </PMBox>
              )}
          </PMTimelineContent>
        </PMTimelineItem>
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

type TimelineButton = {
  label: string;
  onClick: () => void;
};

type TimelineStepConfig = {
  title: string;
  description?: string;
  color: PMTextColors;
  isLast: boolean;
  buttons?: TimelineButton[];
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

function getTimelineConfig(
  state: DraftCardState,
  handlers: TimelineHandlers,
): TimelineConfig {
  switch (state) {
    case DraftCardState.ASSESSING:
      return {
        step1: {
          title: 'Checking the detectability of the rule',
          color: 'primary',
          isLast: false,
        },
        step2: {
          title: 'Generating program',
          color: 'faded',
          isLast: false,
        },
        step3: {
          title: 'Ready to use',
          color: 'faded',
          isLast: true,
        },
      };

    case DraftCardState.ASSESSMENT_FAILED:
      return {
        step1: {
          title: 'The rule can not be detected',
          color: 'error',
          isLast: false,
        },
        step2: {
          title: 'Generating program',
          color: 'faded',
          isLast: false,
        },
        step3: {
          title: 'Ready to use',
          color: 'faded',
          isLast: true,
        },
      };

    case DraftCardState.ASSESSMENT_SUCCESSFUL:
      return {
        step1: {
          title: 'The rule can be detected',
          color: 'success',
          isLast: false,
        },
        step2: {
          title: 'Generating program',
          description:
            'Packmind AI generates a program that comply with rule specifications. Program is ran on code examples to ensure its validity',
          color: 'primary',
          isLast: false,
        },
        step3: {
          title: 'Ready to use',
          color: 'faded',
          isLast: true,
        },
      };

    case DraftCardState.GENERATING:
      return {
        step1: {
          title: 'The rule can be detected',
          color: 'success',
          isLast: false,
        },
        step2: {
          title: 'Generating program',
          description:
            'Packmind AI generates a program that comply with rule specifications. Program is ran on code examples to ensure its validity',
          color: 'primary',
          isLast: false,
          buttons: [
            {
              label: 'Show log',
              onClick: handlers.onShowLogs,
            },
          ],
        },
        step3: {
          title: 'Ready to use',
          color: 'faded',
          isLast: true,
        },
      };

    case DraftCardState.GENERATION_FAILED:
      return {
        step1: {
          title: 'The rule can be detected',
          color: 'success',
          isLast: false,
        },
        step2: {
          title: 'Unable to generate a program',
          color: 'error',
          isLast: false,
          buttons: [
            {
              label: 'Retry',
              onClick: handlers.onRetryDraft,
            },
            {
              label: 'Show log',
              onClick: handlers.onShowLogs,
            },
          ],
        },
        step3: {
          title: 'Ready to use',
          color: 'faded',
          isLast: true,
        },
      };

    case DraftCardState.GENERATION_SUCCESSFUL:
      return {
        step1: {
          title: 'The rule can be detected',
          color: 'success',
          isLast: false,
        },
        step2: {
          title: 'Program has been generated',
          color: 'success',
          isLast: false,
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
          color: 'primary',
          isLast: true,
          buttons: [
            {
              label: 'Test draft program',
              onClick: handlers.onTestDraft,
            },
            {
              label: 'Set as active',
              onClick: handlers.onMakeActive,
            },
          ],
        },
      };
  }
}
