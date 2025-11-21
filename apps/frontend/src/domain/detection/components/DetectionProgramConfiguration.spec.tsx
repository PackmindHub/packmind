import React from 'react';
import { render, RenderResult } from '@testing-library/react';
import {
  QueryClient,
  QueryClientProvider,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import {
  createDetectionHeuristicsId,
  createRuleDetectionAssessmentId,
  createRuleId,
  createStandardId,
  DetectionHeuristics,
  DetectionStatus,
  LanguageDetectionPrograms,
  ProgrammingLanguage,
  RuleDetectionAssessment,
  RuleDetectionAssessmentStatus,
  DetectionModeEnum,
} from '@packmind/types';
import { DetectionProgramConfiguration } from './DetectionProgramConfiguration';
import { ActiveConfigurationCardData } from './ActiveConfigurationCard';
import { DraftCardData } from './DetectionDraftCard';
import * as DetectionProgramQueries from '../api/queries/DetectionProgramQueries';

jest.mock('../api/queries/DetectionProgramQueries');

type UpdateDetectionHeuristicsMutationResult = UseMutationResult<
  DetectionHeuristics,
  Error,
  {
    standardId: string;
    ruleId: string;
    detectionHeuristicsId: string;
    heuristics: string[];
    clarificationQuestion?: { question: string; answer: string };
  },
  unknown
>;

describe('DetectionProgramConfiguration', () => {
  let props: {
    standardId: string;
    ruleId: string;
    detectionLanguages: string[];
    activeConfigurations: ActiveConfigurationCardData[];
    draftPrograms: DraftCardData[];
    isLoadingActivePrograms: boolean;
    isActiveProgramsError: boolean;
    onGenerateProgram: jest.Mock;
    isGeneratingProgram: boolean;
    onTestProgram: jest.Mock;
    onActivateDraft: jest.Mock;
    activatingDraftId: string | null;
    isActivatingDraft: boolean;
    onRetryDraft: jest.Mock;
  };
  let screen: RenderResult;
  let assessment: RuleDetectionAssessment;
  let detectionHeuristics: DetectionHeuristics;
  let activePrograms: LanguageDetectionPrograms[];

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  beforeEach(() => {
    assessment = {
      id: createRuleDetectionAssessmentId('assessment-id'),
      details: 'Assessment details',
      detectionMode: DetectionModeEnum.SINGLE_AST,
      language: ProgrammingLanguage.TYPESCRIPT,
      ruleId: createRuleId('rule-id'),
      status: RuleDetectionAssessmentStatus.SUCCESS,
      clarificationQuestion: '',
      clarificationAnswers: [],
      updatedAt: new Date('2025-01-01T12:00:00Z'),
    };

    detectionHeuristics = {
      id: createDetectionHeuristicsId('heuristics-id'),
      ruleId: createRuleId('rule-id'),
      language: ProgrammingLanguage.TYPESCRIPT,
      heuristics: ['Initial heuristics text'],
    };

    activePrograms = [];

    props = {
      standardId: createStandardId('standard-id'),
      ruleId: createRuleId('rule-id'),
      detectionLanguages: [ProgrammingLanguage.TYPESCRIPT],
      activeConfigurations: [],
      draftPrograms: [],
      isLoadingActivePrograms: false,
      isActiveProgramsError: false,
      onGenerateProgram: jest.fn(),
      isGeneratingProgram: false,
      onTestProgram: jest.fn(),
      onActivateDraft: jest.fn(),
      activatingDraftId: null,
      isActivatingDraft: false,
      onRetryDraft: jest.fn(),
    };

    jest.clearAllMocks();

    // Setup default mocks for all queries
    jest
      .spyOn(DetectionProgramQueries, 'useGetDetectionHeuristicsQuery')
      .mockReturnValue({ data: detectionHeuristics } as Partial<
        UseQueryResult<DetectionHeuristics | null>
      > as UseQueryResult<DetectionHeuristics | null>);

    jest
      .spyOn(DetectionProgramQueries, 'useGetActiveDetectionProgramsQuery')
      .mockReturnValue({ data: activePrograms } as Partial<
        UseQueryResult<LanguageDetectionPrograms[]>
      > as UseQueryResult<LanguageDetectionPrograms[]>);

    jest
      .spyOn(DetectionProgramQueries, 'useUpdateDetectionHeuristicsMutation')
      .mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
      } as Partial<UpdateDetectionHeuristicsMutationResult> as UpdateDetectionHeuristicsMutationResult);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function renderWithContext() {
    return render(
      <UIProvider>
        <QueryClientProvider client={queryClient}>
          <DetectionProgramConfiguration {...props} />
        </QueryClientProvider>
      </UIProvider>,
    );
  }

  describe('when no detection languages are available', () => {
    beforeEach(() => {
      props.detectionLanguages = [];
      jest
        .spyOn(DetectionProgramQueries, 'useGetRuleDetectionAssessmentQuery')
        .mockReturnValue({ data: assessment } as Partial<
          UseQueryResult<RuleDetectionAssessment | null>
        > as UseQueryResult<RuleDetectionAssessment | null>);

      screen = renderWithContext();
    });

    it('renders nothing', () => {
      expect(screen.container.firstChild).toBeNull();
    });
  });

  describe('when detection languages are available', () => {
    beforeEach(() => {
      jest
        .spyOn(DetectionProgramQueries, 'useGetRuleDetectionAssessmentQuery')
        .mockReturnValue({ data: assessment } as Partial<
          UseQueryResult<RuleDetectionAssessment | null>
        > as UseQueryResult<RuleDetectionAssessment | null>);
    });

    describe('when assessment status is FAILED', () => {
      beforeEach(() => {
        assessment.status = RuleDetectionAssessmentStatus.FAILED;
        screen = renderWithContext();
      });

      it('renders detectability accordion with failed status', () => {
        expect(screen.getByText('Detectability')).toBeInTheDocument();
        expect(screen.getByText('Failed')).toBeInTheDocument();
      });

      it('disables the program accordion', () => {
        // When disabled, the accordion content is not rendered
        expect(screen.queryByText('Generate Program')).not.toBeInTheDocument();
      });
    });

    describe('when assessment status is SUCCESS', () => {
      beforeEach(() => {
        assessment.status = RuleDetectionAssessmentStatus.SUCCESS;
        screen = renderWithContext();
      });

      it('renders detectability accordion with success status', () => {
        expect(screen.getByText('Detectability')).toBeInTheDocument();
        expect(screen.getByText('Success')).toBeInTheDocument();
      });

      it('enables the program accordion', () => {
        // When enabled, the accordion content is rendered
        expect(screen.getByText('No configurations yet')).toBeInTheDocument();
      });
    });

    describe('when assessment status is IN_PROGRESS', () => {
      beforeEach(() => {
        assessment.status = RuleDetectionAssessmentStatus.IN_PROGRESS;
        screen = renderWithContext();
      });

      it('renders detectability accordion with in progress status', () => {
        expect(screen.getByText('Detectability')).toBeInTheDocument();
        expect(screen.getByText('In progress')).toBeInTheDocument();
      });

      it('disables the program accordion', () => {
        // When disabled, the accordion content is not rendered
        expect(screen.queryByText('Generate Program')).not.toBeInTheDocument();
      });
    });

    describe('program accordion status', () => {
      describe('when generating program', () => {
        beforeEach(() => {
          props.isGeneratingProgram = true;
          screen = renderWithContext();
        });

        it('displays in progress status', () => {
          expect(screen.getByText('In progress')).toBeInTheDocument();
        });
      });

      describe('when active configurations have READY status', () => {
        beforeEach(() => {
          props.activeConfigurations = [
            {
              detectionProgram: {
                status: DetectionStatus.READY,
              },
            } as ActiveConfigurationCardData,
          ];
          screen = renderWithContext();
        });

        it('displays success status for program accordion', () => {
          const successBadges = screen.getAllByText('Success');
          expect(successBadges.length).toBeGreaterThan(0);
        });
      });

      describe('when active configurations have ERROR status', () => {
        beforeEach(() => {
          props.activeConfigurations = [
            {
              detectionProgram: {
                status: DetectionStatus.ERROR,
              },
            } as ActiveConfigurationCardData,
          ];
          screen = renderWithContext();
        });

        it('displays failed status for program accordion', () => {
          const failedBadges = screen.getAllByText('Failed');
          expect(failedBadges.length).toBeGreaterThan(0);
        });
      });

      describe('when active configurations have FAILURE status', () => {
        beforeEach(() => {
          props.activeConfigurations = [
            {
              detectionProgram: {
                status: DetectionStatus.FAILURE,
              },
            } as ActiveConfigurationCardData,
          ];
          screen = renderWithContext();
        });

        it('displays failed status for program accordion', () => {
          const failedBadges = screen.getAllByText('Failed');
          expect(failedBadges.length).toBeGreaterThan(0);
        });
      });
    });

    describe('program accordion disabled state', () => {
      describe('when assessment status is FAILED', () => {
        beforeEach(() => {
          assessment.status = RuleDetectionAssessmentStatus.FAILED;
          screen = renderWithContext();
        });

        it('disables the program accordion', () => {
          // When disabled, the accordion content is not rendered
          expect(
            screen.queryByText('Generate Program'),
          ).not.toBeInTheDocument();
        });
      });
    });
  });
});
