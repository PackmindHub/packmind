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
import { DetectionDraftCard, DraftCardData } from './DetectionDraftCard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import * as DetectionProgramQueries from '../../api/queries/DetectionProgramQueries';
jest.mock('../../api/queries/DetectionProgramQueries');

describe('ProgramGenerationTimeline', () => {
  let screen: RenderResult;
  let baseDraft: DraftCardData;

  let onMakeActive: jest.Mock;
  let onRetryDraft: jest.Mock;
  let onTestDraft: jest.Mock;
  let onShowProgram: jest.Mock;
  let onShowLogs: jest.Mock;

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

    onMakeActive = jest.fn();
    onRetryDraft = jest.fn();
    onTestDraft = jest.fn();
    onShowProgram = jest.fn();
    onShowLogs = jest.fn();
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
            onMakeActive={onMakeActive}
            onTestDraft={onTestDraft}
            onRetryDraft={onRetryDraft}
            onShowLogs={onShowLogs}
            onShowProgram={onShowProgram}
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
            expect(onShowLogs).toHaveBeenCalled();
          });
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
            await waitFor(() => {
              expect(onShowLogs).toHaveBeenCalled();
            });
          });

          it('calls onRetryDraft when "Retry" button is clicked', () => {
            const retryButton = screen.getByText('Retry');
            fireEvent.click(retryButton);
          });
        });

        describe('when program generation succeeded', () => {
          beforeEach(() => {
            baseDraft.status = DetectionStatus.READY;
          });

          describe('when there is an active program', () => {
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
              await waitFor(() => {
                expect(onShowLogs).toHaveBeenCalled();
              });
            });

            it('opens program drawer when "Show program" button is clicked', async () => {
              const showProgramButton = screen.getByText('Show program');
              fireEvent.click(showProgramButton);
              await waitFor(() => {
                expect(onShowProgram).toHaveBeenCalled();
              });
            });

            it('calls onTestDraft when "Test draft program" button is clicked', async () => {
              const testDraftButton = screen.getByText('Test draft program');
              fireEvent.click(testDraftButton);

              await waitFor(() => {
                expect(onTestDraft).toHaveBeenCalled();
              });
            });

            it('shows confirmation dialog when "Set as active" button is clicked', async () => {
              const setActiveButton = screen.getByText('Set as active');
              fireEvent.click(setActiveButton);
              await waitFor(() => {
                expect(
                  screen.getByText('Activate Detection Program'),
                ).toBeInTheDocument();
                expect(
                  screen.getByText(
                    'Are you sure you want to activate this typescript detection program (v1)? This will replace the current active program.',
                  ),
                ).toBeInTheDocument();
              });
            });

            it('calls onMakeActive when confirmation dialog is confirmed', async () => {
              const setActiveButton = screen.getByText('Set as active');
              fireEvent.click(setActiveButton);

              await waitFor(() => {
                expect(
                  screen.getByText('Activate Detection Program'),
                ).toBeInTheDocument();
              });

              const activateButton = screen.getByRole('button', {
                name: 'Activate',
              });
              fireEvent.click(activateButton);

              await waitFor(() => {
                expect(onMakeActive).toHaveBeenCalled();
              });
            });

            it('does not call onMakeActive when confirmation dialog is cancelled', async () => {
              const setActiveButton = screen.getByText('Set as active');
              fireEvent.click(setActiveButton);

              await waitFor(() => {
                expect(
                  screen.getByText('Activate Detection Program'),
                ).toBeInTheDocument();
              });

              const cancelButton = screen.getByRole('button', {
                name: 'Cancel',
              });
              fireEvent.click(cancelButton);

              await waitFor(() => {
                expect(
                  screen.queryByText('Activate Detection Program'),
                ).not.toBeInTheDocument();
              });
              expect(onMakeActive).not.toHaveBeenCalled();
            });
          });

          describe('when there is no active program', () => {
            beforeEach(() => {
              baseDraft.activeDetectionProgramId = '';
              screen = renderWithContext(
                createAssessment(RuleDetectionAssessmentStatus.SUCCESS),
              );
            });

            it('calls onMakeActive directly without confirmation dialog', async () => {
              const setActiveButton = screen.getByText('Set as active');
              fireEvent.click(setActiveButton);

              await waitFor(() => {
                expect(onMakeActive).toHaveBeenCalled();
              });
              expect(
                screen.queryByText('Activate Detection Program'),
              ).not.toBeInTheDocument();
            });
          });
        });
      });
    });
  });
});
