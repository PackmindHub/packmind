import React, { ReactNode, useState } from 'react';
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
} from '@packmind/ui';
import { DetectionProgram } from '@packmind/types';
import { DetectionStatus } from '@packmind/types';
import { useGetRuleDetectionAssessmentQuery } from '../api/queries/DetectionProgramQueries';
import { ConfigurationCard, ConfigurationCardProps } from './ConfigurationCard';
import { DraftCardData } from './DetectionDraftCard';
import { DetectionAssessmentDrawer } from './DetectionAssessmentDrawer';
import { RxQuestionMarkCircled } from 'react-icons/rx';

export enum ActiveConfigurationState {
  OK = 'ok',
  TO_REVIEW = 'toReview',
  NO_CONFIG = 'noConfig',
  IN_PROGRESS = 'inProgress',
  ERROR = 'error',
}

export type ActiveConfigurationCardData = {
  id: string;
  language: string;
  detectionProgram: DetectionProgram | null | undefined;
  draftProgram: DetectionProgram | null | undefined;
  state: ActiveConfigurationState;
  isExampleOnly?: boolean;
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
}) => {
  const testProgramAction: PMEllipsisMenuAction = {
    value: 'test',
    content: 'Test program',
    onClick: () => onTestProgram(configuration),
  };
  const configurationCardProps: ConfigurationCardProps = {
    id: configuration.id,
    language: configuration.language,
    actionsDisabled: false,
    menuActions: [],
  };
  let configurationCardChildren: ReactNode | null = null;
  let mainButtonProps: IPMButtonProps | null | undefined;

  switch (configuration.state) {
    case ActiveConfigurationState.NO_CONFIG:
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
        />
      );

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
        <PMText color="faded" fontSize="sm">
          Version {configuration.detectionProgram?.version ?? '—'}
        </PMText>
      );
      break;
    case ActiveConfigurationState.TO_REVIEW:
      configurationCardProps.badge = {
        label: 'To review',
        colorPalette: 'gray',
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
        <PMText color="faded" fontSize="sm">
          Version {configuration.detectionProgram?.version ?? '—'}
        </PMText>
      );
      break;
    case ActiveConfigurationState.ERROR:
      break;
  }

  return (
    <ConfigurationCard {...configurationCardProps}>
      {configurationCardChildren}
    </ConfigurationCard>
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
};
const ActiveConfigurationCardAssessment: React.FC<
  ActiveConfigurationCardAssessmentProps
> = ({ id, language, standardId, ruleId, isGenerating, onGenerateProgram }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data: assessment } = useGetRuleDetectionAssessmentQuery(
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

      configurationCardProps.mainAction = (
        <PMButton
          size="sm"
          variant="outline"
          onClick={() => setIsDrawerOpen(true)}
        >
          View Details
        </PMButton>
      );

      return (
        <>
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
          <DetectionAssessmentDrawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            assessment={assessment}
            standardId={standardId}
            ruleId={ruleId}
            language={language}
          />
        </>
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
