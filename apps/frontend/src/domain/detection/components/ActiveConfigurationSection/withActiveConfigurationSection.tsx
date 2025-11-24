import React, { ReactNode } from 'react';
import { PMButton, PMText, PMVStack, PMHStack, PMIcon } from '@packmind/ui';
import { DetectionStatus } from '@packmind/types';
import { ProgramVersionBadge } from '../ProgramVersionBadge';
import {
  ActiveConfigurationSectionProps,
  ActiveConfigurationState,
} from './types';
import { getToReviewMainAction } from './utils';
import { DetectabilitySection } from './sections/DetectabilitySection';
import { TestActiveVersionSection } from './sections/TestActiveVersionSection';
import { FalsePositivesSection } from './sections/FalsePositivesSection';
import { OutdatedSection } from './sections/OutdatedSection';
import { LuCircleAlert } from 'react-icons/lu';

export interface WithActiveConfigurationSectionOptions {
  isAssessmentFeatureEnabled?: boolean;
  standardName?: string;
}

export function withActiveConfigurationSection(
  props: ActiveConfigurationSectionProps,
  options?: WithActiveConfigurationSectionOptions,
): ReactNode {
  const {
    configuration,
    onGenerateProgram,
    isGenerating = false,
    onTestProgram,
    onActivateDraft,
    isActivatingDraft = false,
  } = props;

  const { isAssessmentFeatureEnabled = false, standardName = 'Standard name' } =
    options || {};

  const sections: ReactNode[] = [];

  switch (configuration.state) {
    case ActiveConfigurationState.NO_CONFIG:
      // This case is handled separately in the main component
      return null;

    case ActiveConfigurationState.IN_PROGRESS:
      return (
        <PMText color="faded" fontSize="sm">
          Configuration in progress.
        </PMText>
      );

    case ActiveConfigurationState.OK: {
      sections.push(
        <DetectabilitySection
          key="detectability"
          onLinterUsageClick={() => onTestProgram(configuration)}
          standardName={standardName}
        />,
      );

      sections.push(
        <TestActiveVersionSection
          key="test"
          onTestClick={() => onTestProgram(configuration)}
        />,
      );

      sections.push(
        <FalsePositivesSection
          key="false-positives"
          onCodeExamplesClick={() => {
            // TODO: Implement code examples navigation
          }}
        />,
      );

      return (
        <PMVStack alignItems="stretch" gap={4} width="full">
          {sections}
        </PMVStack>
      );
    }

    case ActiveConfigurationState.TO_REVIEW: {
      const mainButtonProps = getToReviewMainAction({
        configuration,
        onGenerateProgram,
        onActivateDraft,
        isActivatingDraft,
        isGenerating,
      });

      return (
        <PMVStack alignItems="stretch" gap={4} width="full">
          <PMHStack justifyContent="space-between" alignItems="center">
            <PMVStack alignItems="flex-start" gap={2}>
              <ProgramVersionBadge
                version={configuration.detectionProgram?.version ?? 1}
                createdAt={configuration.detectionProgram?.createdAt}
                programState="active"
                status={
                  configuration.detectionProgram?.status ??
                  DetectionStatus.TO_REVIEW
                }
              />
              {configuration.draftProgram && (
                <PMText fontSize="sm" color="faded">
                  Draft v{configuration.draftProgram.version} requires review
                </PMText>
              )}
            </PMVStack>
            {mainButtonProps && (
              <PMButton size="sm" variant="outline" {...mainButtonProps} />
            )}
          </PMHStack>
        </PMVStack>
      );
    }

    case ActiveConfigurationState.OUTDATED:
      sections.push(
        <OutdatedSection
          key="outdated"
          onGenerateProgramClick={() =>
            onGenerateProgram
              ? onGenerateProgram(configuration.language)
              : undefined
          }
          isGenerating={isGenerating}
        />,
      );

      sections.push(
        <TestActiveVersionSection
          key="test"
          onTestClick={() => onTestProgram(configuration)}
        />,
      );

      sections.push(
        <FalsePositivesSection
          key="false-positives"
          onCodeExamplesClick={() => {
            // TODO: Implement code examples navigation
          }}
        />,
      );

      return (
        <PMVStack alignItems="stretch" gap={4} width="full">
          <PMVStack alignItems="flex-start" gap={2}>
            <ProgramVersionBadge
              version={configuration.detectionProgram?.version ?? 1}
              createdAt={configuration.detectionProgram?.createdAt}
              programState="outdated"
              status={
                configuration.detectionProgram?.status ?? DetectionStatus.READY
              }
            />
            <PMHStack gap={1} alignItems="center">
              <PMIcon color="text.warning" size="xs">
                <LuCircleAlert />
              </PMIcon>
              <PMText fontSize="sm" color="warning">
                Rule specifications have changed. Regenerate to ensure accuracy.
              </PMText>
            </PMHStack>
          </PMVStack>
          {sections}
        </PMVStack>
      );

    case ActiveConfigurationState.ERROR:
      return null;

    default:
      return null;
  }
}
