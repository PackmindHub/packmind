import React, { useState } from 'react';
import {
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
  PMBox,
  PMIcon,
} from '@packmind/ui';
import {
  RuleDetectionAssessmentStatus,
  DetectionStatus,
} from '@packmind/types';
import { LuCheck, LuCircle, LuLoader } from 'react-icons/lu';
import { ActiveConfigurationSectionData as ActiveConfigurationCardData } from './ActiveConfigurationSection/';
import { ExecutionLogsDrawer } from './ExecutionLogsDrawer';

interface ProgramGenerationTimelineProps {
  standardId: string;
  ruleId: string;
  assessmentStatus?: RuleDetectionAssessmentStatus;
  activeConfigurations: ActiveConfigurationCardData[];
  isGeneratingProgram: boolean;
  onTestProgram: (config: ActiveConfigurationCardData) => void;
}

type TimelineStage = 'assessed' | 'generating' | 'ready';

function getCurrentStage(
  assessmentStatus?: RuleDetectionAssessmentStatus,
  isGeneratingProgram?: boolean,
  activeConfigurations?: ActiveConfigurationCardData[],
): TimelineStage | null {
  // If assessment succeeded, we're at least at stage 1
  if (assessmentStatus === RuleDetectionAssessmentStatus.SUCCESS) {
    // Check if we have a ready program
    const hasReadyProgram = activeConfigurations?.some(
      (config) => config.detectionProgram?.status === DetectionStatus.READY,
    );

    if (hasReadyProgram) {
      return 'ready';
    }

    // Check if generating
    if (isGeneratingProgram) {
      return 'generating';
    }

    // Check if any program is in progress
    const hasInProgressProgram = activeConfigurations?.some(
      (config) =>
        config.detectionProgram?.status === DetectionStatus.IN_PROGRESS,
    );

    if (hasInProgressProgram) {
      return 'generating';
    }

    return 'assessed';
  }

  return null;
}

export const ProgramGenerationTimeline: React.FC<
  ProgramGenerationTimelineProps
> = ({
  standardId,
  ruleId,
  assessmentStatus,
  activeConfigurations,
  isGeneratingProgram,
  onTestProgram,
}) => {
  const [isLogsDrawerOpen, setIsLogsDrawerOpen] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(
    null,
  );

  const currentStage = getCurrentStage(
    assessmentStatus,
    isGeneratingProgram,
    activeConfigurations,
  );

  const readyConfiguration = activeConfigurations.find(
    (config) => config.detectionProgram?.status === DetectionStatus.READY,
  );

  const handleViewLogs = () => {
    if (readyConfiguration?.detectionProgram?.id) {
      setSelectedProgramId(readyConfiguration.detectionProgram.id);
      setIsLogsDrawerOpen(true);
    }
  };

  const handleSeeProgram = () => {
    if (readyConfiguration) {
      onTestProgram(readyConfiguration);
    }
  };

  const isStageComplete = (stage: TimelineStage): boolean => {
    if (!currentStage) return false;

    const stages: TimelineStage[] = ['assessed', 'generating', 'ready'];
    const currentIndex = stages.indexOf(currentStage);
    const stageIndex = stages.indexOf(stage);

    return stageIndex < currentIndex;
  };

  const isStageActive = (stage: TimelineStage): boolean => {
    return currentStage === stage;
  };

  if (!currentStage) {
    return null;
  }

  const getIndicatorIcon = (stage: TimelineStage) => {
    if (isStageComplete(stage)) {
      return (
        <PMIcon color="text.success" size="xs">
          <LuCheck />
        </PMIcon>
      );
    }
    if (isStageActive(stage)) {
      if (stage === 'generating') {
        return (
          <PMIcon color="branding.primary" size="xs">
            <LuLoader />
          </PMIcon>
        );
      }
      return (
        <PMIcon color="branding.primary" size="xs">
          <LuCheck />
        </PMIcon>
      );
    }
    return (
      <PMIcon color="text.tertiary" size="xs">
        <LuCircle />
      </PMIcon>
    );
  };

  return (
    <>
      <PMBox width="full" py={2}>
        <PMTimeline variant="outline">
          {/* Stage 1: Assessed as detectable */}
          <PMTimelineItem>
            <PMTimelineSeparator>
              <PMTimelineIndicator icon={getIndicatorIcon('assessed')} />
              <PMTimelineConnector />
            </PMTimelineSeparator>
            <PMTimelineContent>
              <PMTimelineTitle>
                Rule has been assessed as detectable
              </PMTimelineTitle>
            </PMTimelineContent>
          </PMTimelineItem>

          {/* Stage 2: Program is generating */}
          <PMTimelineItem>
            <PMTimelineSeparator>
              <PMTimelineIndicator icon={getIndicatorIcon('generating')} />
              <PMTimelineConnector />
            </PMTimelineSeparator>
            <PMTimelineContent>
              <PMTimelineTitle>Program is generating</PMTimelineTitle>
              <PMTimelineDescription>
                Packmind AI generates a program that complies with rule
                specifications. Program is ran on code examples to ensure its
                validity.
              </PMTimelineDescription>
              {isStageActive('generating') && (
                <PMHStack gap={2} mt={2}>
                  <PMButton
                    size="sm"
                    variant="outline"
                    onClick={handleViewLogs}
                    disabled={!readyConfiguration?.detectionProgram?.id}
                  >
                    Logs
                  </PMButton>
                  <PMButton
                    size="sm"
                    variant="outline"
                    onClick={handleSeeProgram}
                    disabled={!readyConfiguration}
                  >
                    See Program
                  </PMButton>
                </PMHStack>
              )}
            </PMTimelineContent>
          </PMTimelineItem>

          {/* Stage 3: Ready to use */}
          <PMTimelineItem>
            <PMTimelineSeparator>
              <PMTimelineIndicator icon={getIndicatorIcon('ready')} />
            </PMTimelineSeparator>
            <PMTimelineContent>
              <PMTimelineTitle>Ready to use</PMTimelineTitle>
              {isStageActive('ready') && (
                <PMHStack gap={2} mt={2}>
                  <PMButton
                    size="sm"
                    variant="outline"
                    onClick={handleViewLogs}
                    disabled={!readyConfiguration?.detectionProgram?.id}
                  >
                    Logs
                  </PMButton>
                  <PMButton
                    size="sm"
                    variant="outline"
                    onClick={handleSeeProgram}
                    disabled={!readyConfiguration}
                  >
                    See Program
                  </PMButton>
                </PMHStack>
              )}
            </PMTimelineContent>
          </PMTimelineItem>
        </PMTimeline>
      </PMBox>

      {selectedProgramId && (
        <ExecutionLogsDrawer
          isOpen={isLogsDrawerOpen}
          onClose={() => {
            setIsLogsDrawerOpen(false);
            setSelectedProgramId(null);
          }}
          standardId={standardId}
          ruleId={ruleId}
          detectionProgramId={selectedProgramId}
        />
      )}
    </>
  );
};
