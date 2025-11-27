import { DetectionAccordion } from './DetectionAccordion';
import { DetectabilitySection } from './DetectabilitySection';
import React, { useMemo } from 'react';
import { useGetRuleDetectionAssessmentQuery } from '../../api/queries';
import { RuleDetectionAssessmentStatus } from '@packmind/types';
import { PMBadge } from '@packmind/ui';

export enum DetectionAccordionStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  IN_PROGRESS = 'IN_PROGRESS',
}

const STATUS_CONFIG: Record<
  DetectionAccordionStatus,
  { text: string; colorPalette: string }
> = {
  [DetectionAccordionStatus.SUCCESS]: {
    text: 'Success',
    colorPalette: 'green',
  },
  [DetectionAccordionStatus.FAILED]: {
    text: 'Failed',
    colorPalette: 'red',
  },
  [DetectionAccordionStatus.IN_PROGRESS]: {
    text: 'In progress',
    colorPalette: 'blue',
  },
};

function convertToAccordionStatus(
  status: RuleDetectionAssessmentStatus,
): DetectionAccordionStatus {
  switch (status) {
    case RuleDetectionAssessmentStatus.SUCCESS:
      return DetectionAccordionStatus.SUCCESS;
    case RuleDetectionAssessmentStatus.FAILED:
      return DetectionAccordionStatus.FAILED;
    case RuleDetectionAssessmentStatus.IN_PROGRESS:
      return DetectionAccordionStatus.IN_PROGRESS;
    default:
      return DetectionAccordionStatus.IN_PROGRESS;
  }
}

type DetectabilityAccordionProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  standardId: string;
  ruleId: string;
  language: string;
};

const DetectabilityBadge: React.FunctionComponent<{
  status?: DetectionAccordionStatus;
}> = ({ status }) => {
  if (!status) return null;

  const badgeConfig = STATUS_CONFIG[status];
  return (
    <PMBadge colorPalette={badgeConfig.colorPalette} variant="solid">
      {badgeConfig.text}
    </PMBadge>
  );
};

export const DetectabilityAccordion: React.FunctionComponent<
  DetectabilityAccordionProps
> = ({ isOpen, onOpenChange, standardId, ruleId, language }) => {
  const { data: assessment } = useGetRuleDetectionAssessmentQuery(
    standardId,
    ruleId,
    language,
  );

  const detectabilityStatus = useMemo(() => {
    return assessment?.status
      ? convertToAccordionStatus(assessment.status)
      : undefined;
  }, [assessment?.status]);

  return (
    <DetectionAccordion
      title="Detectability"
      open={isOpen}
      onOpenChange={onOpenChange}
      actions={<DetectabilityBadge status={detectabilityStatus} />}
    >
      <DetectabilitySection
        standardId={standardId}
        ruleId={ruleId}
        language={language}
      />
    </DetectionAccordion>
  );
};
