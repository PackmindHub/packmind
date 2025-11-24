import React, { ReactNode } from 'react';
import {
  IPMButtonProps,
  PMBox,
  PMButton,
  PMEllipsisMenuAction,
  PMHStack,
  PMIcon,
  PMText,
  PMTooltip,
  PMVStack,
  DETECTION_ASSESSMENT_DRAWER_FEATURE_KEY,
  DEFAULT_FEATURE_DOMAIN_MAP,
  isFeatureFlagEnabled,
} from '@packmind/ui';
import { DetectionProgram } from '@packmind/types';
import { DetectionStatus } from '@packmind/types';
import {
  useGetRuleDetectionAssessmentQuery,
  useGetDetectionHeuristicsQuery,
} from '../api/queries/DetectionProgramQueries';
import { useGetMeQuery } from '../../accounts/api/queries/UserQueries';
import { ConfigurationCard, ConfigurationCardProps } from './ConfigurationCard';
import { DraftCardData } from './DetectionDraftCard/DetectionDraftCard';
import { RxQuestionMarkCircled } from 'react-icons/rx';
import { ProgramVersionBadge } from './ProgramVersionBadge';
import { LuCircleAlert } from 'react-icons/lu';

export enum ActiveConfigurationState {
  OK = 'ok',
  TO_REVIEW = 'toReview',
  NO_CONFIG = 'noConfig',
  IN_PROGRESS = 'inProgress',
  ERROR = 'error',
  OUTDATED = 'outdated',
}

export type ActiveConfigurationCardData = {
  id: string;
  language: string;
  detectionProgram: DetectionProgram | null | undefined;
  draftProgram: DetectionProgram | null | undefined;
  state: ActiveConfigurationState;
  isExampleOnly?: boolean;
  isOutdated?: boolean;
};

export type ActiveConfigurationCardProps = {
  configuration: ActiveConfigurationCardData;
  onGenerateProgram?: (language: string) => void;
  isGenerating?: boolean;
  standardId: string;
  ruleId: string;
  onTestProgram: (program: ActiveConfigurationCardData) => void;
  onActivateDraft?: (draft: DraftCardData) => void;
  activatingDraftId?: string | null;
  isActivatingDraft?: boolean;
  onOpenAssessmentDrawer: (language: string) => void;
};

export const ActiveConfigurationCard: React.FC<
  ActiveConfigurationCardProps
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

  const testProgramAction: PMEllipsisMenuAction = {
    value: 'test',
    content: 'Test program',
    onClick: () => onTestProgram(configuration),
  };

  const assessmentAction: PMEllipsisMenuAction = {
    value: 'assessment',
    content: 'Assessment',
    onClick: () => onOpenAssessmentDrawer(configuration.language),
  };

  const addAssessmentAction = (menuActions: PMEllipsisMenuAction[]) => {
    if (isAssessmentFeatureEnabled) {
      menuActions.push(assessmentAction);
    }
  };

  const configurationCardProps: ConfigurationCardProps = {
    id: configuration.id,
    language: configuration.language,
    actionsDisabled: false,
    menuActions: [],
  };
  let configurationCardChildren: ReactNode | null = null;
  let mainButtonProps: IPMButtonProps | null | undefined;
  let renderNoConfigCard = false;

  addAssessmentAction(configurationCardProps.menuActions);

  switch (configuration.state) {
    case ActiveConfigurationState.NO_CONFIG:
      renderNoConfigCard = true;
      break;

    case ActiveConfigurationState.IN_PROGRESS:
      configurationCardChildren = (
        <PMText color="faded" fontSize="sm">
          Configuration in progress.
        </PMText>
      );
      break;

    case ActiveConfigurationState.OK:
      configurationCardProps.badge = {
        label: 'OK',
        colorPalette: 'green',
      };
      configurationCardProps.menuActions.push(testProgramAction);

      configurationCardChildren = (
        <PMVStack alignItems="flex-start" gap={2}>
          <ProgramVersionBadge
            version={configuration.detectionProgram?.version ?? 1}
            createdAt={configuration.detectionProgram?.createdAt}
            programState="active"
            status={DetectionStatus.READY}
          />
          {configuration.draftProgram && (
            <PMHStack gap={1} alignItems="center">
              <PMIcon color="text.success" size="xs">
                <LuCircleAlert />
              </PMIcon>
              <PMText fontSize="sm" color="success">
                Draft v{configuration.draftProgram.version} available
              </PMText>
            </PMHStack>
          )}
        </PMVStack>
      );
      break;
    case ActiveConfigurationState.TO_REVIEW:
      configurationCardProps.badge = {
        label: 'To review',
        colorPalette: 'orange',
      };
      configurationCardProps.menuActions.push(testProgramAction);
      mainButtonProps = getToReviewMainAction({
        configuration,
        onGenerateProgram,
        onActivateDraft,
        isActivatingDraft,
        isGenerating,
      });
      if (mainButtonProps) {
        configurationCardProps.mainAction = (
          <PMButton size="sm" variant="outline" {...mainButtonProps} />
        );
      }

      configurationCardChildren = (
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
      );
      break;
    case ActiveConfigurationState.OUTDATED:
      configurationCardProps.badge = {
        label: 'Outdated',
        colorPalette: 'orange',
      };
      configurationCardProps.menuActions.push(testProgramAction);
      mainButtonProps = {
        onClick: () =>
          onGenerateProgram
            ? onGenerateProgram(configuration.language)
            : undefined,
        children: 'Regenerate',
        loading: isGenerating,
        disabled: isGenerating,
      };
      configurationCardProps.mainAction = (
        <PMButton size="sm" variant="outline" {...mainButtonProps} />
      );

      configurationCardChildren = (
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
      );
      break;
    case ActiveConfigurationState.ERROR:
      break;
  }

  return (
    <>
      {renderNoConfigCard ? (
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
      ) : (
        <ConfigurationCard {...configurationCardProps}>
          {configurationCardChildren}
        </ConfigurationCard>
      )}
    </>
  );
};

function getToReviewMainAction({
  configuration,
  onGenerateProgram,
  onActivateDraft,
  isGenerating,
  isActivatingDraft,
}: Pick<
  ActiveConfigurationCardProps,
  | 'configuration'
  | 'onGenerateProgram'
  | 'onActivateDraft'
  | 'isGenerating'
  | 'isActivatingDraft'
>): IPMButtonProps | null {
  if (!onGenerateProgram || !onActivateDraft) {
    return null;
  }

  const draftProgram = configuration.draftProgram ?? null;
  if (!draftProgram) {
    return {
      onClick: () => onGenerateProgram(configuration.language),
      children: 'New draft',
      loading: isGenerating,
      disabled: isGenerating,
    };
  }

  const draftCard: DraftCardData = {
    id: `${configuration.id}-draft-${draftProgram.id}`,
    language: draftProgram.language ?? configuration.language,
    activeDetectionProgramId: configuration.id,
    draftProgram,
    status: draftProgram.status,
    mode: draftProgram.mode,
    version: draftProgram.version,
  };

  if (draftProgram?.status === DetectionStatus.READY) {
    return {
      onClick: () => onActivateDraft(draftCard),
      children: 'Activate draft',
      loading: isActivatingDraft,
      disabled: isActivatingDraft,
    };
  }

  if (draftProgram.status === DetectionStatus.TO_REVIEW) {
    return {
      onClick: () => onGenerateProgram(configuration.language),
      children: 'Update draft',
      loading: isGenerating,
      disabled: isGenerating,
    };
  }

  return {
    onClick: () => onGenerateProgram(configuration.language),
    children: 'Retry draft',
    loading: isGenerating,
    disabled: isGenerating,
  };
}

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

  const configurationCardProps: ConfigurationCardProps = {
    id,
    language,
    actionsDisabled: false,
    menuActions: [],
  };

  if (assessment) {
    if (assessment.status === 'IN_PROGRESS') {
      return (
        <ConfigurationCard {...configurationCardProps}>
          <PMText color="faded" fontSize="sm">
            Checking if the rule can be detected by linter...
          </PMText>
        </ConfigurationCard>
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

      if (isAssessmentFeatureEnabled && detectionHeuristics) {
        configurationCardProps.mainAction = (
          <PMButton size="sm" variant="outline" onClick={onOpenDrawer}>
            Refine
          </PMButton>
        );
      }

      return (
        <ConfigurationCard {...configurationCardProps}>
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
        </ConfigurationCard>
      );
    }

    configurationCardProps.mainAction = (
      <PMButton
        size="sm"
        variant="outline"
        onClick={onGenerateProgram}
        loading={isGenerating}
      >
        Configure
      </PMButton>
    );
    return (
      <ConfigurationCard {...configurationCardProps}>
        <PMText color="faded" fontSize="sm">
          No configuration.
        </PMText>
      </ConfigurationCard>
    );
  }

  return (
    <ConfigurationCard {...configurationCardProps}>
      <PMText color="faded" fontSize="sm">
        Loading assessment data.
      </PMText>
    </ConfigurationCard>
  );
};
