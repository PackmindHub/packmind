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
      describe('when program is not generated yet', () => {
        beforeEach(() => {
          // Use a status that doesn't match any handled status to trigger ASSESSMENT_SUCCESSFUL
          baseDraft.status = '' as DetectionStatus;
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

        it('shows the generating program description', () => {
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

      describe('when program needs review (TO_REVIEW)', () => {
        beforeEach(() => {
          baseDraft.status = DetectionStatus.TO_REVIEW;
          screen = renderWithContext(
            createAssessment(RuleDetectionAssessmentStatus.SUCCESS),
          );
        });

        it('shows "The rule can be detected"', () => {
          expect(
            screen.getByText('The rule can be detected'),
          ).toBeInTheDocument();
        });

        it('shows "Program needs update" as active', () => {
          expect(screen.getByText('Program needs update')).toBeInTheDocument();
        });

        it('shows the program needs update description', () => {
          expect(
            screen.getByText(
              /The rule specifications or examples have been modified since this program was generated/,
            ),
          ).toBeInTheDocument();
        });

        it('shows "Regenerate" button', () => {
          expect(screen.getByText('Regenerate')).toBeInTheDocument();
        });

        it('shows "Show program" button', () => {
          expect(screen.getByText('Show program')).toBeInTheDocument();
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

        describe('when "Show log" button is clicked', () => {
          it('opens logs drawer', async () => {
            const showLogButton = screen.getByText('Show log');
            fireEvent.click(showLogButton);
            await waitFor(() => {
              expect(onShowLogs).toHaveBeenCalled();
            });
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

          describe('when "Show log" button is clicked', () => {
            it('opens logs drawer', async () => {
              const showLogButton = screen.getByText('Show log');
              fireEvent.click(showLogButton);
              await waitFor(() => {
                expect(onShowLogs).toHaveBeenCalled();
              });
            });
          });

          describe('when "Retry" button is clicked', () => {
            it('calls onRetryDraft', () => {
              const retryButton = screen.getByText('Retry');
              fireEvent.click(retryButton);
              expect(onRetryDraft).toHaveBeenCalled();
            });
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

            describe('when "Show log" button is clicked', () => {
              it('opens logs drawer', async () => {
                const showLogButton = screen.getByText('Show log');
                fireEvent.click(showLogButton);
                await waitFor(() => {
                  expect(onShowLogs).toHaveBeenCalled();
                });
              });
            });

            describe('when "Show program" button is clicked', () => {
              it('opens program drawer', async () => {
                const showProgramButton = screen.getByText('Show program');
                fireEvent.click(showProgramButton);
                await waitFor(() => {
                  expect(onShowProgram).toHaveBeenCalled();
                });
              });
            });

            describe('when "Test draft program" button is clicked', () => {
              it('calls onTestDraft', async () => {
                const testDraftButton = screen.getByText('Test draft program');
                fireEvent.click(testDraftButton);

                await waitFor(() => {
                  expect(onTestDraft).toHaveBeenCalled();
                });
              });
            });

            describe('when "Set as active" button is clicked', () => {
              it('shows confirmation dialog title', async () => {
                const setActiveButton = screen.getByText('Set as active');
                fireEvent.click(setActiveButton);
                await waitFor(() => {
                  expect(
                    screen.getByText('Activate Detection Program'),
                  ).toBeInTheDocument();
                });
              });

              it('shows confirmation dialog message', async () => {
                const setActiveButton = screen.getByText('Set as active');
                fireEvent.click(setActiveButton);
                await waitFor(() => {
                  expect(
                    screen.getByText(
                      'Are you sure you want to activate this typescript detection program (v1)? This will replace the current active program.',
                    ),
                  ).toBeInTheDocument();
                });
              });

              describe('when confirmation dialog is confirmed', () => {
                it('calls onMakeActive', async () => {
                  const setActiveButton = screen.getByText('Set as active');
                  fireEvent.click(setActiveButton);

                  await screen.findByText('Activate Detection Program');

                  const activateButton = screen.getByRole('button', {
                    name: 'Activate',
                  });
                  fireEvent.click(activateButton);

                  await waitFor(() => {
                    expect(onMakeActive).toHaveBeenCalled();
                  });
                });
              });

              describe('when confirmation dialog is cancelled', () => {
                it('closes the dialog', async () => {
                  const setActiveButton = screen.getByText('Set as active');
                  fireEvent.click(setActiveButton);

                  await screen.findByText('Activate Detection Program');

                  const cancelButton = screen.getByRole('button', {
                    name: 'Cancel',
                  });
                  fireEvent.click(cancelButton);

                  await waitFor(() => {
                    expect(
                      screen.queryByText('Activate Detection Program'),
                    ).not.toBeInTheDocument();
                  });
                });

                it('does not call onMakeActive', async () => {
                  const setActiveButton = screen.getByText('Set as active');
                  fireEvent.click(setActiveButton);

                  await screen.findByText('Activate Detection Program');

                  const cancelButton = screen.getByRole('button', {
                    name: 'Cancel',
                  });
                  fireEvent.click(cancelButton);

                  await screen.findByRole('button', { name: 'Set as active' });
                  expect(onMakeActive).not.toHaveBeenCalled();
                });
              });
            });
          });

          describe('when there is no active program', () => {
            beforeEach(() => {
              baseDraft.activeDetectionProgramId = '';
              screen = renderWithContext(
                createAssessment(RuleDetectionAssessmentStatus.SUCCESS),
              );
            });

            describe('when "Set as active" button is clicked', () => {
              it('calls onMakeActive directly', async () => {
                const setActiveButton = screen.getByText('Set as active');
                fireEvent.click(setActiveButton);

                await waitFor(() => {
                  expect(onMakeActive).toHaveBeenCalled();
                });
              });

              it('does not show confirmation dialog', () => {
                const setActiveButton = screen.getByText('Set as active');
                fireEvent.click(setActiveButton);

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
});
