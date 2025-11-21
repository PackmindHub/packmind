import React from 'react';
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
  type PMTextColors,
} from '@packmind/ui';
import {
  DetectionProgram,
  RuleDetectionAssessmentStatus,
  DetectionStatus,
} from '@packmind/types';
import { useGetRuleDetectionAssessmentQuery } from '@packmind/proprietary/frontend/domain/detection';

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
  onMakeActive: _onMakeActive,
  isActivating: _isActivating = false,
  onTestDraft: _onTestDraft,
  onRetryDraft: _onRetryDraft,
  isGenerating: _isGenerating = false,
  standardId,
  ruleId,
}) => {
  const { data: assessment } = useGetRuleDetectionAssessmentQuery(
    standardId,
    ruleId,
    draft.language,
  );

  const state = determineDraftCardState(assessment?.status, draft.status);

  const timelineConfig = getTimelineConfig(state);

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
          </PMTimelineContent>
        </PMTimelineItem>
      </PMTimeline>
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

type TimelineStepConfig = {
  title: string;
  description?: string;
  color: PMTextColors;
  isLast: boolean;
};

type TimelineConfig = {
  step1: TimelineStepConfig;
  step2: TimelineStepConfig;
  step3: TimelineStepConfig;
};

function getTimelineConfig(state: DraftCardState): TimelineConfig {
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
        },
        step3: {
          title: 'Ready to use',
          color: 'primary',
          isLast: true,
        },
      };
  }
}
