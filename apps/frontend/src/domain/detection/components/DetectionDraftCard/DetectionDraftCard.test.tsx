import React from 'react';
import {
  render,
  RenderResult,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import {
  DetectionStatus,
  RuleDetectionAssessmentStatus,
  RuleDetectionAssessment,
  DetectionModeEnum,
  ProgrammingLanguage,
  createRuleDetectionAssessmentId,
  createRuleId,
  createStandardId,
} from '@packmind/types';
import {
  determineDraftCardState,
  DraftCardState,
  DetectionDraftCard,
  DraftCardData,
} from './DetectionDraftCard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import * as DetectionProgramQueries from '../../api/queries/DetectionProgramQueries';

jest.mock('../../api/queries/DetectionProgramQueries');

describe('determineDraftCardState', () => {
  describe('when assessment is not started or in progress', () => {
    it('returns ASSESSING when assessment status is undefined', () => {
      const state = determineDraftCardState(
        undefined,
        DetectionStatus.IN_PROGRESS,
      );
      expect(state).toEqual(DraftCardState.ASSESSING);
    });

    it('returns ASSESSING when assessment status is NOT_STARTED', () => {
      const state = determineDraftCardState(
        RuleDetectionAssessmentStatus.NOT_STARTED,
        DetectionStatus.IN_PROGRESS,
      );
      expect(state).toEqual(DraftCardState.ASSESSING);
    });

    it('returns ASSESSING when assessment status is IN_PROGRESS', () => {
      const state = determineDraftCardState(
        RuleDetectionAssessmentStatus.IN_PROGRESS,
        DetectionStatus.IN_PROGRESS,
      );
      expect(state).toEqual(DraftCardState.ASSESSING);
    });
  });

  describe('when assessment is done', () => {
    describe('when assessment failed', () => {
      it('returns ASSESSMENT_FAILED', () => {
        const state = determineDraftCardState(
          RuleDetectionAssessmentStatus.FAILED,
          DetectionStatus.IN_PROGRESS,
        );
        expect(state).toEqual(DraftCardState.ASSESSMENT_FAILED);
      });
    });

    describe('when assessment succeeded', () => {
      it('returns ASSESSMENT_SUCCESSFUL when draft status is TO_REVIEW', () => {
        const state = determineDraftCardState(
          RuleDetectionAssessmentStatus.SUCCESS,
          DetectionStatus.TO_REVIEW,
        );
        expect(state).toEqual(DraftCardState.ASSESSMENT_SUCCESSFUL);
      });

      describe('when program generation is in progress', () => {
        it('returns GENERATING when draft status is IN_PROGRESS', () => {
          const state = determineDraftCardState(
            RuleDetectionAssessmentStatus.SUCCESS,
            DetectionStatus.IN_PROGRESS,
          );
          expect(state).toEqual(DraftCardState.GENERATING);
        });
      });

      describe('when program generation is done', () => {
        describe('when program generation failed', () => {
          it('returns GENERATION_FAILED when draft status is FAILURE', () => {
            const state = determineDraftCardState(
              RuleDetectionAssessmentStatus.SUCCESS,
              DetectionStatus.FAILURE,
            );
            expect(state).toEqual(DraftCardState.GENERATION_FAILED);
          });

          it('returns GENERATION_FAILED when draft status is ERROR', () => {
            const state = determineDraftCardState(
              RuleDetectionAssessmentStatus.SUCCESS,
              DetectionStatus.ERROR,
            );
            expect(state).toEqual(DraftCardState.GENERATION_FAILED);
          });
        });

        describe('when program generation succeeded', () => {
          it('returns GENERATION_SUCCESSFUL when draft status is READY', () => {
            const state = determineDraftCardState(
              RuleDetectionAssessmentStatus.SUCCESS,
              DetectionStatus.READY,
            );
            expect(state).toEqual(DraftCardState.GENERATION_SUCCESSFUL);
          });
        });
      });
    });
  });
});

describe('ProgramGenerationTimeline', () => {
  let screen: RenderResult;
  let baseDraft: DraftCardData;
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  beforeEach(() => {
    baseDraft = {
      id: 'draft-123',
      language: 'typescript',
      activeDetectionProgramId: 'active-456',
      draftProgram: {
        id: 'program-123',
        ruleId: createRuleId('rule-456'),
        language: ProgrammingLanguage.TYPESCRIPT,
        status: DetectionStatus.IN_PROGRESS,
        code: '',
        sourceCodeState: 'NONE' as const,
        version: 1,
        mode: 'singleAst',
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      status: DetectionStatus.IN_PROGRESS,
      mode: 'AI_GENERATION',
      version: 1,
    };

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function renderWithContext(assessment?: RuleDetectionAssessment) {
    jest
      .spyOn(DetectionProgramQueries, 'useGetRuleDetectionAssessmentQuery')
      .mockReturnValue({
        data: assessment,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

    // Mock the metadata query used by ExecutionLogsDrawer
    jest
      .spyOn(DetectionProgramQueries, 'useGetDetectionProgramMetadataQuery')
      .mockReturnValue({
        data: undefined,
        isLoading: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

    return render(
      <UIProvider>
        <QueryClientProvider client={queryClient}>
          <DetectionDraftCard
            draft={baseDraft}
            onMakeActive={jest.fn()}
            onTestDraft={jest.fn()}
            onRetryDraft={jest.fn()}
            standardId={createStandardId('standard-123')}
            ruleId={createRuleId('rule-456')}
          />
        </QueryClientProvider>
      </UIProvider>,
    );
  }

  function createAssessment(
    status: RuleDetectionAssessmentStatus,
  ): RuleDetectionAssessment {
    return {
      id: createRuleDetectionAssessmentId('assessment-123'),
      ruleId: createRuleId('rule-456'),
      language: ProgrammingLanguage.TYPESCRIPT,
      detectionMode: DetectionModeEnum.SINGLE_AST,
      status,
      details: 'Assessment details',
      clarificationQuestion: null,
      clarificationAnswers: null,
      updatedAt: new Date(),
    };
  }

  describe('when assessment is running', () => {
    beforeEach(() => {
      screen = renderWithContext(
        createAssessment(RuleDetectionAssessmentStatus.IN_PROGRESS),
      );
    });

    it('shows "Checking the detectability of the rule"', () => {
      expect(
        screen.getByText('Checking the detectability of the rule'),
      ).toBeInTheDocument();
    });

    it('disables the "Generating program" section', () => {
      const generatingText = screen.getByText('Generating program');
      // The text should be present but with faded color
      expect(generatingText).toBeInTheDocument();
    });

    it('disables the "Ready to use" section', () => {
      const readyText = screen.getByText('Ready to use');
      // The text should be present but with faded color
      expect(readyText).toBeInTheDocument();
    });

    it('displays "Draft: pending" badge', () => {
      expect(screen.getByText('Draft: pending')).toBeInTheDocument();
    });
  });

  describe('when assessment is done', () => {
    describe('when assessment failed', () => {
      beforeEach(() => {
        screen = renderWithContext(
          createAssessment(RuleDetectionAssessmentStatus.FAILED),
        );
      });

      it('shows "The rule can not be detected"', () => {
        expect(
          screen.getByText('The rule can not be detected'),
        ).toBeInTheDocument();
      });

      it('disables the "Generating program" section', () => {
        expect(screen.getByText('Generating program')).toBeInTheDocument();
      });

      it('disables the "Ready to use" section', () => {
        expect(screen.getByText('Ready to use')).toBeInTheDocument();
      });

      it('displays "Draft: failure" badge', () => {
        expect(screen.getByText('Draft: failure')).toBeInTheDocument();
      });
    });

    describe('when assessment succeeded', () => {
      beforeEach(() => {
        baseDraft.status = DetectionStatus.TO_REVIEW;
      });

      describe('when program is not generated yet', () => {
        beforeEach(() => {
          screen = renderWithContext(
            createAssessment(RuleDetectionAssessmentStatus.SUCCESS),
          );
        });

        it('shows "The rule can be detected"', () => {
          expect(
            screen.getByText('The rule can be detected'),
          ).toBeInTheDocument();
        });

        it('shows "Generating program" as active with description', () => {
          expect(screen.getByText('Generating program')).toBeInTheDocument();
          expect(
            screen.getByText(
              /Packmind AI generates a program that comply with rule specifications/,
            ),
          ).toBeInTheDocument();
        });

        it('disables the "Ready to use" section', () => {
          expect(screen.getByText('Ready to use')).toBeInTheDocument();
        });

        it('displays "Draft: pending" badge', () => {
          expect(screen.getByText('Draft: pending')).toBeInTheDocument();
        });
      });

      describe('when program is being generated', () => {
        beforeEach(() => {
          baseDraft.status = DetectionStatus.IN_PROGRESS;
          screen = renderWithContext(
            createAssessment(RuleDetectionAssessmentStatus.SUCCESS),
          );
        });

        it('shows "The rule can be detected"', () => {
          expect(
            screen.getByText('The rule can be detected'),
          ).toBeInTheDocument();
        });

        it('shows "Generating program" as active', () => {
          expect(screen.getByText('Generating program')).toBeInTheDocument();
        });

        it('disables the "Ready to use" section', () => {
          expect(screen.getByText('Ready to use')).toBeInTheDocument();
        });

        it('opens logs drawer when "Show log" button is clicked', async () => {
          const showLogButton = screen.getByText('Show log');
          fireEvent.click(showLogButton);
          // ExecutionLogsDrawer should be visible after clicking
          await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
          });
        });

        it('displays "Draft: pending" badge', () => {
          expect(screen.getByText('Draft: pending')).toBeInTheDocument();
        });
      });

      describe('when program generation is done', () => {
        describe('when program generation failed', () => {
          beforeEach(() => {
            baseDraft.status = DetectionStatus.FAILURE;
            screen = renderWithContext(
              createAssessment(RuleDetectionAssessmentStatus.SUCCESS),
            );
          });

          it('shows "The rule can be detected"', () => {
            expect(
              screen.getByText('The rule can be detected'),
            ).toBeInTheDocument();
          });

          it('shows "Unable to generate a program"', () => {
            expect(
              screen.getByText('Unable to generate a program'),
            ).toBeInTheDocument();
          });

          it('disables the "Ready to use" section', () => {
            expect(screen.getByText('Ready to use')).toBeInTheDocument();
          });

          it('opens logs drawer when "Show log" button is clicked', async () => {
            const showLogButton = screen.getByText('Show log');
            fireEvent.click(showLogButton);
            // ExecutionLogsDrawer should be visible after clicking
            await waitFor(() => {
              expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
          });

          it('calls onRetryDraft when "Retry" button is clicked', () => {
            const retryButton = screen.getByText('Retry');
            fireEvent.click(retryButton);
          });

          it('displays "Draft: failure" badge', () => {
            expect(screen.getByText('Draft: failure')).toBeInTheDocument();
          });
        });

        describe('when program generation succeeded', () => {
          beforeEach(() => {
            baseDraft.status = DetectionStatus.READY;
            screen = renderWithContext(
              createAssessment(RuleDetectionAssessmentStatus.SUCCESS),
            );
          });

          it('shows "The rule can be detected"', () => {
            expect(
              screen.getByText('The rule can be detected'),
            ).toBeInTheDocument();
          });

          it('shows "Program has been generated"', () => {
            expect(
              screen.getByText('Program has been generated'),
            ).toBeInTheDocument();
          });

          it('shows "Ready to use" as active', () => {
            expect(screen.getByText('Ready to use')).toBeInTheDocument();
          });

          it('opens logs drawer when "Show log" button is clicked', async () => {
            const showLogButton = screen.getByText('Show log');
            fireEvent.click(showLogButton);
            // ExecutionLogsDrawer should be visible after clicking
            await waitFor(() => {
              expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
          });

          it('opens program drawer when "Show program" button is clicked', async () => {
            const showProgramButton = screen.getByText('Show program');
            fireEvent.click(showProgramButton);
            // ProgramContentDrawer should be visible after clicking
            await waitFor(() => {
              expect(screen.getByText('Program Content')).toBeInTheDocument();
            });
          });

          it('calls onTestDraft when "Test draft program" button is clicked', () => {
            const testDraftButton = screen.getByText('Test draft program');
            fireEvent.click(testDraftButton);
          });

          it('calls onMakeActive when "Set as active" button is clicked', () => {
            const setActiveButton = screen.getByText('Set as active');
            fireEvent.click(setActiveButton);
          });

          it('displays "Draft: OK" badge', () => {
            expect(screen.getByText('Draft: OK')).toBeInTheDocument();
          });
        });
      });
    });
  });
});
