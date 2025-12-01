import { useMemo } from 'react';
import { IPMButtonProps } from '@packmind/ui';
import {
  RuleDetectionAssessmentStatus,
  DetectionStatus,
} from '@packmind/types';
import {
  useGetDetectionHeuristicsQuery,
  useGetRuleDetectionAssessmentQuery,
} from '../../api/queries/DetectionProgramQueries';
import { getToReviewMainAction } from './utils';
import {
  ActiveConfigurationSectionData,
  ActiveConfigurationSectionProps,
} from './types';
import {
  ActiveConfigurationSectionKey,
  ActiveConfigurationViewDescriptor,
  ActiveConfigurationViewState,
  resolveActiveConfigurationView,
} from './viewState';

type HookParams = Pick<
  ActiveConfigurationSectionProps,
  | 'configuration'
  | 'standardId'
  | 'ruleId'
  | 'standardName'
  | 'onGenerateProgram'
  | 'isGenerating'
  | 'onTestProgram'
  | 'onActivateDraft'
  | 'isActivatingDraft'
  | 'onOpenAssessmentDrawer'
  | 'onNavigateToExamples'
  | 'onReviewDraft'
> & {
  isAssessmentFeatureEnabled: boolean;
};

export type NoConfigurationAssessmentView =
  | { status: 'loading' }
  | { status: 'inProgress' }
  | {
      status: 'failed';
      details?: string;
      canRefine: boolean;
      onRefine: () => void;
    }
  | { status: 'ready' };

type DetectabilityDescriptor = {
  key: ActiveConfigurationSectionKey.DETECTABILITY;
  props: {
    standardName?: string;
  };
};

type TestDescriptor = {
  key: ActiveConfigurationSectionKey.TEST_ACTIVE_VERSION;
  props: {
    onTestClick: () => void;
  };
};

type FalsePositivesDescriptor = {
  key: ActiveConfigurationSectionKey.FALSE_POSITIVES;
  props: {
    onCodeExamplesClick: () => void;
  };
};

type ToReviewDescriptor = {
  key: ActiveConfigurationSectionKey.TO_REVIEW_CARD;
  props: {
    onGenerateProgramClick: () => void;
    onReviewDraft?: () => void;
    isGenerating: boolean;
    hasDraftToReview: boolean;
    isDraftInProgress: boolean;
  };
};

type DraftSummaryDescriptor = {
  key: ActiveConfigurationSectionKey.DRAFT_REVIEW_SUMMARY;
  props: {
    draftVersion?: number | string | null;
    mainButtonProps: IPMButtonProps | null;
  };
};

export type SectionDescriptor =
  | DetectabilityDescriptor
  | TestDescriptor
  | FalsePositivesDescriptor
  | ToReviewDescriptor
  | DraftSummaryDescriptor;

export type ActiveConfigurationSectionViewModel = {
  descriptor: ActiveConfigurationViewDescriptor;
  sections: SectionDescriptor[];
  assessmentView: NoConfigurationAssessmentView | null;
};

export const useActiveConfigurationSectionViewModel = (
  params: HookParams,
): ActiveConfigurationSectionViewModel => {
  const {
    configuration,
    standardId,
    ruleId,
    standardName,
    onGenerateProgram,
    isGenerating = false,
    onTestProgram,
    onActivateDraft,
    isActivatingDraft = false,
    onOpenAssessmentDrawer,
    isAssessmentFeatureEnabled,
    onNavigateToExamples,
    onReviewDraft,
  } = params;

  const descriptor = useMemo(
    () => resolveActiveConfigurationView(configuration),
    [configuration],
  );

  const assessmentQuery = useGetRuleDetectionAssessmentQuery(
    standardId,
    ruleId,
    configuration.language,
  );

  const heuristicsQuery = useGetDetectionHeuristicsQuery(
    standardId,
    ruleId,
    configuration.language,
  );

  const assessmentView = useMemo<NoConfigurationAssessmentView | null>(() => {
    if (
      descriptor.viewState !== ActiveConfigurationViewState.NO_CONFIGURATION
    ) {
      return null;
    }

    const assessment = assessmentQuery.data;
    if (!assessment) {
      return { status: 'loading' };
    }

    if (assessment.status === RuleDetectionAssessmentStatus.IN_PROGRESS) {
      return { status: 'inProgress' };
    }

    if (assessment.status === RuleDetectionAssessmentStatus.FAILED) {
      const canRefine =
        isAssessmentFeatureEnabled && Boolean(heuristicsQuery.data);

      return {
        status: 'failed',
        details: assessment.details ?? undefined,
        canRefine,
        onRefine: () => onOpenAssessmentDrawer(configuration.language),
      };
    }

    return { status: 'ready' };
  }, [
    assessmentQuery.data,
    configuration.language,
    heuristicsQuery.data,
    isAssessmentFeatureEnabled,
    onOpenAssessmentDrawer,
    descriptor.viewState,
  ]);

  const sections = useMemo<SectionDescriptor[]>(() => {
    return descriptor.sectionKeys.reduce<SectionDescriptor[]>((acc, key) => {
      switch (key) {
        case ActiveConfigurationSectionKey.DETECTABILITY:
          acc.push({
            key,
            props: {
              standardName,
            },
          });
          break;
        case ActiveConfigurationSectionKey.TEST_ACTIVE_VERSION:
          acc.push({
            key,
            props: {
              onTestClick: () => onTestProgram(configuration),
            },
          });
          break;
        case ActiveConfigurationSectionKey.FALSE_POSITIVES:
          acc.push({
            key,
            props: {
              onCodeExamplesClick: onNavigateToExamples ?? (() => undefined),
            },
          });
          break;
        case ActiveConfigurationSectionKey.TO_REVIEW_CARD:
          acc.push({
            key,
            props: {
              onGenerateProgramClick: () =>
                onGenerateProgram
                  ? onGenerateProgram(configuration.language)
                  : undefined,
              onReviewDraft,
              isGenerating,
              hasDraftToReview:
                configuration?.draftProgram?.status !== undefined &&
                [DetectionStatus.READY, DetectionStatus.TO_REVIEW].includes(
                  configuration.draftProgram.status,
                ),
              isDraftInProgress:
                configuration?.draftProgram?.status ===
                DetectionStatus.IN_PROGRESS,
            },
          });
          break;
        case ActiveConfigurationSectionKey.DRAFT_REVIEW_SUMMARY:
          acc.push({
            key,
            props: {
              draftVersion: configuration.draftProgram?.version ?? null,
              mainButtonProps: getToReviewMainAction({
                configuration,
                onGenerateProgram,
                onActivateDraft,
                isGenerating,
                isActivatingDraft,
              }),
            },
          });
          break;
        default:
          break;
      }

      return acc;
    }, []);
  }, [
    configuration,
    descriptor.sectionKeys,
    isActivatingDraft,
    isGenerating,
    onActivateDraft,
    onGenerateProgram,
    onNavigateToExamples,
    onReviewDraft,
    onTestProgram,
    standardName,
  ]);

  return {
    descriptor,
    sections,
    assessmentView,
  };
};
