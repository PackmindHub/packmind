import React, { ReactNode } from 'react';
import { PMButton, PMText, PMVStack, PMHStack } from '@packmind/ui';
import {
  ActiveConfigurationSectionProps,
  ActiveConfigurationState,
} from './types';
import { getToReviewMainAction } from './utils';
import { DetectabilitySection } from './sections/DetectabilitySection';
import { TestActiveVersionSection } from './sections/TestActiveVersionSection';
import { FalsePositivesSection } from './sections/FalsePositivesSection';
import { ToReviewSection } from './sections/ToReviewSection';

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

  const { standardName } = options || {};

  const sections: ReactNode[] = [];

  switch (configuration.state) {
    case ActiveConfigurationState.NO_CONFIG:
      // This case is handled separately in the main component
      return null;

    case ActiveConfigurationState.IN_PROGRESS:
      return (
        <PMVStack alignItems="stretch" gap={4} width="full">
          <PMText color="faded" fontSize="sm">
            Configuration in progress.
          </PMText>
        </PMVStack>
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
      // If there's an active program, show ToReviewSection + other sections (excluding DetectabilitySection)
      if (configuration.detectionProgram) {
        sections.push(
          <ToReviewSection
            key="to-review"
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
            {sections}
          </PMVStack>
        );
      }

      // If there's only a draft program (no active program), show minimal UI
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

    case ActiveConfigurationState.ERROR:
      return null;

    default:
      return null;
  }
}
