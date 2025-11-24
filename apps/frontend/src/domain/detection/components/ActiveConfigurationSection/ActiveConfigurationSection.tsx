import React from 'react';
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
import {
  useGetRuleDetectionAssessmentQuery,
  useGetDetectionHeuristicsQuery,
} from '../../api/queries/DetectionProgramQueries';
import { useGetMeQuery } from '../../../accounts/api/queries/UserQueries';
import { RxQuestionMarkCircled } from 'react-icons/rx';
import {
  ActiveConfigurationSectionProps,
  ActiveConfigurationState,
} from './types';
import { withActiveConfigurationSection } from './withActiveConfigurationSection';

export const ActiveConfigurationSection: React.FC<
  ActiveConfigurationSectionProps
> = ({
  configuration,
  onGenerateProgram,
  isGenerating = false,
  standardId,
  ruleId,
  onTestProgram,
  onActivateDraft,
  activatingDraftId,
  isActivatingDraft = false,
  onOpenAssessmentDrawer,
}) => {
  const { data: meData } = useGetMeQuery();
  const userEmail = meData?.authenticated === true ? meData.user.email : null;

  const isAssessmentFeatureEnabled = isFeatureFlagEnabled({
    featureKeys: [DETECTION_ASSESSMENT_DRAWER_FEATURE_KEY],
    featureDomainMap: DEFAULT_FEATURE_DOMAIN_MAP,
    userEmail,
  });

  // Handle undefined configuration
  if (!configuration) {
    return null;
  }

  // Handle NO_CONFIG state separately with assessment component
  if (configuration.state === ActiveConfigurationState.NO_CONFIG) {
    return (
      <ActiveConfigurationCardAssessment
        id={configuration.id}
        ruleId={ruleId}
        standardId={standardId}
        language={configuration.language}
        isGenerating={isGenerating}
        onGenerateProgram={() =>
          onGenerateProgram
            ? onGenerateProgram(configuration.language)
            : undefined
        }
        onOpenDrawer={() => onOpenAssessmentDrawer(configuration.language)}
        userEmail={userEmail}
        isAssessmentFeatureEnabled={isAssessmentFeatureEnabled}
      />
    );
  }

  // Use HOC for all other states
  return withActiveConfigurationSection(
    {
      configuration,
      onGenerateProgram,
      isGenerating,
      standardId,
      ruleId,
      onTestProgram,
      onActivateDraft,
      activatingDraftId,
      isActivatingDraft,
      onOpenAssessmentDrawer,
    },
    {
      isAssessmentFeatureEnabled,
    },
  );
};

type ActiveConfigurationCardAssessmentProps = {
  id: string;
  language: string;
  standardId: string;
  ruleId: string;
  isGenerating: boolean;
  onGenerateProgram: () => void;
  onOpenDrawer: () => void;
  userEmail: string | null;
  isAssessmentFeatureEnabled: boolean;
};
const ActiveConfigurationCardAssessment: React.FC<
  ActiveConfigurationCardAssessmentProps
> = ({
  id,
  language,
  standardId,
  ruleId,
  isGenerating,
  onGenerateProgram,
  onOpenDrawer,
  isAssessmentFeatureEnabled,
}) => {
  const { data: assessment } = useGetRuleDetectionAssessmentQuery(
    standardId,
    ruleId,
    language,
  );

  const { data: detectionHeuristics } = useGetDetectionHeuristicsQuery(
    standardId,
    ruleId,
    language,
  );

  if (assessment) {
    if (assessment.status === 'IN_PROGRESS') {
      return (
        <PMText color="faded" fontSize="sm">
          Checking if the rule can be detected by linter...
        </PMText>
      );
    }

    if (assessment.status === 'FAILED') {
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
        <PMHStack
          justifyContent="space-between"
          alignItems="center"
          width="full"
        >
          <PMHStack>
            <PMText color="faded" fontSize="sm">
              This rule can not be automated.
            </PMText>
            <PMTooltip label={tooltipLabel} placement="top">
              <PMIcon
                as={RxQuestionMarkCircled}
                color={'text.tertiary'}
                boxSize={4}
                cursor="help"
              />
            </PMTooltip>
          </PMHStack>
          {isAssessmentFeatureEnabled && detectionHeuristics && (
            <PMButton size="sm" variant="outline" onClick={onOpenDrawer}>
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
        >
          Configure
        </PMButton>
      </PMHStack>
    );
  }

  return (
    <PMText color="faded" fontSize="sm">
      Loading assessment data.
    </PMText>
  );
};
