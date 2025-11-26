import {
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMText,
  PMTooltip,
  PMVStack,
  DETECTION_ASSESSMENT_DRAWER_FEATURE_KEY,
  DEFAULT_FEATURE_DOMAIN_MAP,
  isFeatureFlagEnabled,
} from '@packmind/ui';
import React from 'react';
import { useGetMeQuery } from '../../../accounts/api/queries/UserQueries';
import { RxQuestionMarkCircled } from 'react-icons/rx';
import { ActiveConfigurationSectionProps } from './types';
import {
  useActiveConfigurationSectionViewModel,
  NoConfigurationAssessmentView,
} from './useActiveConfigurationSectionViewModel';
import {
  ActiveConfigurationSectionKey,
  ActiveConfigurationViewState,
} from './viewState';
import { SectionDescriptor } from './useActiveConfigurationSectionViewModel';
import { DetectabilitySection } from './sections/DetectabilitySection';
import { TestActiveVersionSection } from './sections/TestActiveVersionSection';
import { FalsePositivesSection } from './sections/FalsePositivesSection';
import { ToReviewSection } from './sections/ToReviewSection';
import { DraftReviewSummarySection } from './sections/DraftReviewSummarySection';

export const ActiveConfigurationSection: React.FC<
  ActiveConfigurationSectionProps
> = (props) => {
  const { configuration } = props;
  const { data: meData } = useGetMeQuery();
  const userEmail = meData?.authenticated === true ? meData.user.email : null;

  const isAssessmentFeatureEnabled = isFeatureFlagEnabled({
    featureKeys: [DETECTION_ASSESSMENT_DRAWER_FEATURE_KEY],
    featureDomainMap: DEFAULT_FEATURE_DOMAIN_MAP,
    userEmail,
  });

  if (!configuration) {
    return null;
  }

  return (
    <ActiveConfigurationSectionInner
      {...props}
      configuration={configuration}
      isAssessmentFeatureEnabled={isAssessmentFeatureEnabled}
    />
  );
};

type ActiveConfigurationSectionInnerProps = ActiveConfigurationSectionProps & {
  isAssessmentFeatureEnabled: boolean;
};

const ActiveConfigurationSectionInner: React.FC<
  ActiveConfigurationSectionInnerProps
> = ({
  configuration,
  onGenerateProgram,
  isGenerating = false,
  standardId,
  standardName,
  ruleId,
  onTestProgram,
  onActivateDraft,
  isActivatingDraft = false,
  onOpenAssessmentDrawer,
  isAssessmentFeatureEnabled,
  onNavigateToExamples,
}) => {
  const { descriptor, sections, assessmentView } =
    useActiveConfigurationSectionViewModel({
      configuration,
      standardId,
      ruleId,
      standardName,
      onGenerateProgram,
      isGenerating,
      onTestProgram,
      onActivateDraft,
      isActivatingDraft,
      onOpenAssessmentDrawer,
      isAssessmentFeatureEnabled,
      onNavigateToExamples,
    });

  if (descriptor.viewState === ActiveConfigurationViewState.NO_CONFIGURATION) {
    return (
      <NoConfigurationCard
        assessment={assessmentView}
        isGenerating={isGenerating}
        onGenerateProgram={
          onGenerateProgram
            ? () => onGenerateProgram(configuration.language)
            : undefined
        }
      />
    );
  }

  if (descriptor.viewState === ActiveConfigurationViewState.IN_PROGRESS) {
    return (
      <PMVStack alignItems="stretch" gap={4} width="full">
        <PMText color="faded" fontSize="sm">
          Configuration in progress.
        </PMText>
      </PMVStack>
    );
  }

  if (descriptor.viewState === ActiveConfigurationViewState.ERROR) {
    return null;
  }

  return <StateSectionsList sections={sections} />;
};

type NoConfigurationCardProps = {
  assessment: NoConfigurationAssessmentView | null;
  isGenerating: boolean;
  onGenerateProgram?: () => void;
};

const NoConfigurationCard: React.FC<NoConfigurationCardProps> = ({
  assessment,
  isGenerating,
  onGenerateProgram,
}) => {
  if (!assessment) {
    return null;
  }

  if (assessment.status === 'loading') {
    return (
      <PMText color="faded" fontSize="sm">
        Loading assessment data.
      </PMText>
    );
  }

  if (assessment.status === 'inProgress') {
    return (
      <PMText color="faded" fontSize="sm">
        Checking if the rule can be detected by linter...
      </PMText>
    );
  }

  if (assessment.status === 'failed') {
    const tooltipLabel = (
      <PMVStack alignItems="flex-start" gap={2} width="full">
        <PMText color="tertiary">
          We have assessed that the rule is not detectable :
        </PMText>
        {assessment.details && (
          <PMBox padding={2} width="full">
            <PMText whiteSpace="pre-wrap">{assessment.details}</PMText>
          </PMBox>
        )}
      </PMVStack>
    );

    return (
      <PMHStack justifyContent="space-between" alignItems="center" width="full">
        <PMHStack>
          <PMText color="faded" fontSize="sm">
            This rule can not be automated.
          </PMText>
          <PMTooltip label={tooltipLabel} placement="top">
            <PMIcon
              as={RxQuestionMarkCircled}
              color="text.tertiary"
              boxSize={4}
              cursor="help"
            />
          </PMTooltip>
        </PMHStack>
        {assessment.canRefine && (
          <PMButton size="sm" variant="outline" onClick={assessment.onRefine}>
            Refine
          </PMButton>
        )}
      </PMHStack>
    );
  }

  return (
    <PMHStack justifyContent="space-between" alignItems="center" width="full">
      <PMText color="faded" fontSize="sm">
        No configuration.
      </PMText>
      <PMButton
        size="sm"
        variant="outline"
        onClick={onGenerateProgram}
        loading={isGenerating}
        disabled={!onGenerateProgram || isGenerating}
      >
        Configure
      </PMButton>
    </PMHStack>
  );
};

const StateSectionsList: React.FC<{ sections: SectionDescriptor[] }> = ({
  sections,
}) => {
  if (!sections.length) {
    return null;
  }

  return (
    <PMVStack alignItems="stretch" gap={4} width="full">
      {sections.map((section) => {
        switch (section.key) {
          case ActiveConfigurationSectionKey.DETECTABILITY:
            return (
              <DetectabilitySection key={section.key} {...section.props} />
            );
          case ActiveConfigurationSectionKey.TEST_ACTIVE_VERSION:
            return (
              <TestActiveVersionSection key={section.key} {...section.props} />
            );
          case ActiveConfigurationSectionKey.FALSE_POSITIVES:
            return (
              <FalsePositivesSection key={section.key} {...section.props} />
            );
          case ActiveConfigurationSectionKey.TO_REVIEW_CARD:
            return <ToReviewSection key={section.key} {...section.props} />;
          case ActiveConfigurationSectionKey.DRAFT_REVIEW_SUMMARY:
            return (
              <DraftReviewSummarySection key={section.key} {...section.props} />
            );
          default:
            return null;
        }
      })}
    </PMVStack>
  );
};
