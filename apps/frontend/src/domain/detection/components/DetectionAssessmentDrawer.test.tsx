import { DetectionAssessmentDrawer } from './DetectionAssessmentDrawer';
import { render, RenderResult } from '@testing-library/react';
import {
  QueryClient,
  QueryClientProvider,
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query';
import * as DetectionProgramQueries from '../api/queries/DetectionProgramQueries';
import {
  createActiveDetectionProgramId,
  createDetectionHeuristicsId,
  createDetectionProgramId,
  createRuleDetectionAssessmentId,
  createRuleId,
  createStandardId,
  DetectionHeuristics,
  DetectionModeEnum,
  DetectionStatus,
  LanguageDetectionPrograms,
  ProgrammingLanguage,
  RuleDetectionAssessment,
  RuleDetectionAssessmentStatus,
} from '@packmind/types';
import React from 'react';
import { UIProvider, pmToaster } from '@packmind/ui';
import userEvent from '@testing-library/user-event';

jest.mock('../api/queries/DetectionProgramQueries');
jest.mock('@packmind/ui', () => ({
  ...jest.requireActual('@packmind/ui'),
  pmToaster: {
    create: jest.fn(),
  },
}));

type UpdateDetectionHeuristicsMutationResult = UseMutationResult<
  DetectionHeuristics,
  Error,
  {
    standardId: string;
    ruleId: string;
    detectionHeuristicsId: string;
    heuristics: string[];
  },
  unknown
>;

describe('DetectionAssessmentDrawer', () => {
  let assessment: RuleDetectionAssessment;
  let props: {
    isOpen: boolean;
    onClose: () => void;
    assessment: RuleDetectionAssessment;
    standardId: string;
    ruleId: string;
    language: string;
  };
  let screen: RenderResult;
  let detectionHeuristics: DetectionHeuristics;
  let activePrograms: LanguageDetectionPrograms[];

  beforeEach(() => {
    jest.clearAllMocks();
    assessment = {
      id: createRuleDetectionAssessmentId('assessment-id'),
      details: 'Some assessment details',
      detectionMode: DetectionModeEnum.SINGLE_AST,
      language: ProgrammingLanguage.TYPESCRIPT,
      ruleId: createRuleId('rule-id'),
      status: RuleDetectionAssessmentStatus.NOT_STARTED,
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
      isOpen: true,
      onClose: jest.fn(),
      assessment,
      standardId: createStandardId('standard-id'),
      ruleId: createRuleId('rule-id'),
      language: ProgrammingLanguage.TYPESCRIPT,
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (screen) {
      screen.unmount();
    }
  });

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

  function renderWithContext() {
    return render(
      <UIProvider>
        <QueryClientProvider client={queryClient}>
          <DetectionAssessmentDrawer {...props} />
        </QueryClientProvider>
      </UIProvider>,
    );
  }

  describe('when drawer is closed', () => {
    beforeEach(() => {
      props.isOpen = false;
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

      screen = renderWithContext();
    });

    it('does not render the drawer content', () => {
      expect(
        screen.queryByText('Rule detection assessment'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when drawer is open', () => {
    beforeEach(() => {
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

    it('renders the drawer title', () => {
      screen = renderWithContext();
      expect(screen.getByText('Rule detection assessment')).toBeInTheDocument();
    });

    describe('when assessment has details', () => {
      beforeEach(() => {
        if (screen) {
          screen.unmount();
        }
        assessment.details = 'Some reasons why this rule cannot be detected';
        screen = renderWithContext();
      });

      it('displays the assessment details', () => {
        expect(
          screen.getByText('Why this rule cannot be detected:'),
        ).toBeInTheDocument();
        expect(screen.getByText(assessment.details)).toBeInTheDocument();
      });
    });

    describe('when assessment has no details', () => {
      beforeEach(() => {
        if (screen) {
          screen.unmount();
        }
        assessment.details = '';
        screen = renderWithContext();
      });

      it('does not display the assessment details section', () => {
        expect(
          screen.queryByText('Why this rule cannot be detected:'),
        ).not.toBeInTheDocument();
      });
    });

    describe('when heuristics are loading', () => {
      beforeEach(() => {
        if (screen) {
          screen.unmount();
        }
        jest
          .spyOn(DetectionProgramQueries, 'useGetDetectionHeuristicsQuery')
          .mockReturnValue({
            data: undefined,
            isLoading: true,
          } as Partial<
            UseQueryResult<DetectionHeuristics | null>
          > as UseQueryResult<DetectionHeuristics | null>);

        screen = renderWithContext();
      });

      it('shows loading message', () => {
        expect(screen.getByText('Loading heuristics...')).toBeInTheDocument();
      });
    });

    describe('when heuristics are not available', () => {
      beforeEach(() => {
        if (screen) {
          screen.unmount();
        }
        jest
          .spyOn(DetectionProgramQueries, 'useGetDetectionHeuristicsQuery')
          .mockReturnValue({ data: null } as Partial<
            UseQueryResult<DetectionHeuristics | null>
          > as UseQueryResult<DetectionHeuristics | null>);

        screen = renderWithContext();
      });

      it('shows empty textarea when heuristics are not available', () => {
        const textarea = screen.getByPlaceholderText(
          'Enter detection heuristics...',
        );
        expect(textarea).toBeInTheDocument();
        expect(textarea).toHaveValue('');
      });
    });

    describe('when heuristics are available', () => {
      beforeEach(() => {
        if (screen) {
          screen.unmount();
        }
        screen = renderWithContext();
      });

      it('displays the heuristics textarea', () => {
        const textarea = screen.getByPlaceholderText(
          'Enter detection heuristics...',
        );
        expect(textarea).toBeInTheDocument();
        expect(textarea).toHaveValue(detectionHeuristics.heuristics.join('\n'));
      });

      describe('when textarea should be editable', () => {
        describe('when assessment is in error', () => {
          beforeEach(() => {
            if (screen) {
              screen.unmount();
            }
            assessment.status = RuleDetectionAssessmentStatus.FAILED;
            screen = renderWithContext();
          });

          it('enables the textarea', () => {
            const textarea = screen.getByPlaceholderText(
              'Enter detection heuristics...',
            );
            expect(textarea).not.toBeDisabled();
          });

          it('shows the Save Changes button', () => {
            expect(screen.getByText('Save Changes')).toBeInTheDocument();
          });

          it('allows editing the heuristics text', async () => {
            const user = userEvent.setup();
            const textarea = screen.getByPlaceholderText(
              'Enter detection heuristics...',
            );

            await user.clear(textarea);
            await user.type(textarea, 'Updated heuristics');

            expect(textarea).toHaveValue('Updated heuristics');
          });

          it('enables Save button when text is changed', async () => {
            const user = userEvent.setup();
            const textarea = screen.getByPlaceholderText(
              'Enter detection heuristics...',
            );
            const saveButton = screen.getByText('Save Changes');

            expect(saveButton).toBeDisabled();

            await user.clear(textarea);
            await user.type(textarea, 'New heuristics');

            expect(saveButton).not.toBeDisabled();
          });
        });

        describe('when program generation is in error', () => {
          beforeEach(() => {
            if (screen) {
              screen.unmount();
            }
            activePrograms = [
              {
                id: createActiveDetectionProgramId('program-id'),
                detectionProgramVersion: createDetectionProgramId(
                  'detection-program-id',
                ),
                ruleId: createRuleId('rule-id'),
                language: ProgrammingLanguage.TYPESCRIPT,
                detectionProgramDraftVersion: null,
                detectionProgram: {
                  id: createDetectionProgramId('detection-program-id'),
                  ruleId: createRuleId('rule-id'),
                  language: ProgrammingLanguage.TYPESCRIPT,
                  status: DetectionStatus.ERROR,
                  mode: DetectionModeEnum.SINGLE_AST,
                  sourceCodeState: 'AST',
                  code: '',
                  version: 1,
                },
                draftDetectionProgram: null,
              },
            ];

            jest
              .spyOn(
                DetectionProgramQueries,
                'useGetActiveDetectionProgramsQuery',
              )
              .mockReturnValue({ data: activePrograms } as Partial<
                UseQueryResult<LanguageDetectionPrograms[]>
              > as UseQueryResult<LanguageDetectionPrograms[]>);

            screen = renderWithContext();
          });

          it('enables the textarea', () => {
            const textarea = screen.getByPlaceholderText(
              'Enter detection heuristics...',
            );
            expect(textarea).not.toBeDisabled();
          });

          it('shows the Save Changes button', () => {
            expect(screen.getByText('Save Changes')).toBeInTheDocument();
          });
        });

        describe('when program generation has failed', () => {
          beforeEach(() => {
            if (screen) {
              screen.unmount();
            }
            activePrograms = [
              {
                id: createActiveDetectionProgramId('program-id'),
                detectionProgramVersion: createDetectionProgramId(
                  'detection-program-id',
                ),
                ruleId: createRuleId('rule-id'),
                language: ProgrammingLanguage.TYPESCRIPT,
                detectionProgramDraftVersion: null,
                detectionProgram: {
                  id: createDetectionProgramId('detection-program-id'),
                  ruleId: createRuleId('rule-id'),
                  language: ProgrammingLanguage.TYPESCRIPT,
                  status: DetectionStatus.FAILURE,
                  mode: DetectionModeEnum.SINGLE_AST,
                  sourceCodeState: 'AST',
                  code: '',
                  version: 1,
                },
                draftDetectionProgram: null,
              },
            ];

            jest
              .spyOn(
                DetectionProgramQueries,
                'useGetActiveDetectionProgramsQuery',
              )
              .mockReturnValue({ data: activePrograms } as Partial<
                UseQueryResult<LanguageDetectionPrograms[]>
              > as UseQueryResult<LanguageDetectionPrograms[]>);

            screen = renderWithContext();
          });

          it('enables the textarea', () => {
            const textarea = screen.getByPlaceholderText(
              'Enter detection heuristics...',
            );
            expect(textarea).not.toBeDisabled();
          });

          it('shows the Save Changes button', () => {
            expect(screen.getByText('Save Changes')).toBeInTheDocument();
          });
        });
      });

      describe('when textarea should be disabled', () => {
        beforeEach(() => {
          if (screen) {
            screen.unmount();
          }
          assessment.status = RuleDetectionAssessmentStatus.SUCCESS;
          activePrograms = [
            {
              id: createActiveDetectionProgramId('program-id'),
              detectionProgramVersion: createDetectionProgramId(
                'detection-program-id',
              ),
              ruleId: createRuleId('rule-id'),
              language: ProgrammingLanguage.TYPESCRIPT,
              detectionProgramDraftVersion: null,
              detectionProgram: {
                id: createDetectionProgramId('detection-program-id'),
                ruleId: createRuleId('rule-id'),
                language: ProgrammingLanguage.TYPESCRIPT,
                status: DetectionStatus.READY,
                mode: DetectionModeEnum.SINGLE_AST,
                sourceCodeState: 'AST',
                code: '',
                version: 1,
              },
              draftDetectionProgram: null,
            },
          ];

          jest
            .spyOn(
              DetectionProgramQueries,
              'useGetActiveDetectionProgramsQuery',
            )
            .mockReturnValue({ data: activePrograms } as Partial<
              UseQueryResult<LanguageDetectionPrograms[]>
            > as UseQueryResult<LanguageDetectionPrograms[]>);

          screen = renderWithContext();
        });

        it('disables the textarea', () => {
          const textarea = screen.getByPlaceholderText(
            'Enter detection heuristics...',
          );
          expect(textarea).toBeDisabled();
        });

        it('does not show the Save Changes button', () => {
          expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
        });
      });

      describe('when saving changes', () => {
        let mutateSpy: ReturnType<typeof jest.fn>;
        let onCloseSpy: ReturnType<typeof jest.fn>;

        beforeEach(() => {
          if (screen) {
            screen.unmount();
          }
          assessment.status = RuleDetectionAssessmentStatus.FAILED;
          mutateSpy = jest.fn();
          onCloseSpy = jest.fn();
          props.onClose = onCloseSpy;

          jest
            .spyOn(
              DetectionProgramQueries,
              'useUpdateDetectionHeuristicsMutation',
            )
            .mockReturnValue({
              mutate: mutateSpy,
              isPending: false,
            } as Partial<UpdateDetectionHeuristicsMutationResult> as UpdateDetectionHeuristicsMutationResult);

          screen = renderWithContext();
        });

        it('calls the mutation with correct parameters', async () => {
          const user = userEvent.setup();
          const textarea = screen.getByPlaceholderText(
            'Enter detection heuristics...',
          );
          const saveButton = screen.getByText('Save Changes');

          await user.clear(textarea);
          await user.type(textarea, 'Updated heuristics');
          await user.click(saveButton);

          expect(mutateSpy).toHaveBeenCalledWith(
            {
              standardId: props.standardId,
              ruleId: props.ruleId,
              detectionHeuristicsId: detectionHeuristics.id,
              heuristics: ['Updated heuristics'],
            },
            expect.any(Object),
          );
        });
      });

      describe('when mutation is pending', () => {
        beforeEach(() => {
          if (screen) {
            screen.unmount();
          }
          assessment.status = RuleDetectionAssessmentStatus.FAILED;

          jest
            .spyOn(
              DetectionProgramQueries,
              'useUpdateDetectionHeuristicsMutation',
            )
            .mockReturnValue({
              mutate: jest.fn(),
              isPending: true,
            } as Partial<UpdateDetectionHeuristicsMutationResult> as UpdateDetectionHeuristicsMutationResult);

          screen = renderWithContext();
        });

        it('disables the textarea', () => {
          const textareas = screen.getAllByPlaceholderText(
            'Enter detection heuristics...',
          );
          const textarea = textareas[textareas.length - 1];
          expect(textarea).toBeDisabled();
        });
      });
    });

    describe('status badge display', () => {
      describe('when status is FAILED', () => {
        beforeEach(() => {
          if (screen) {
            screen.unmount();
          }
          assessment.status = RuleDetectionAssessmentStatus.FAILED;
          screen = renderWithContext();
        });

        it('displays status badge with formatted FAILED status', () => {
          expect(screen.getByText('Status: Failed')).toBeInTheDocument();
        });
      });

      describe('when status is SUCCESS', () => {
        beforeEach(() => {
          if (screen) {
            screen.unmount();
          }
          assessment.status = RuleDetectionAssessmentStatus.SUCCESS;
          screen = renderWithContext();
        });

        it('displays status badge with formatted SUCCESS status', () => {
          expect(screen.getByText('Status: Success')).toBeInTheDocument();
        });
      });

      describe('when status is IN_PROGRESS', () => {
        beforeEach(() => {
          if (screen) {
            screen.unmount();
          }
          assessment.status = RuleDetectionAssessmentStatus.IN_PROGRESS;
          screen = renderWithContext();
        });

        it('displays status badge with formatted IN_PROGRESS status', () => {
          expect(screen.getByText('Status: In Progress')).toBeInTheDocument();
        });
      });

      describe('when status is NOT_STARTED', () => {
        beforeEach(() => {
          if (screen) {
            screen.unmount();
          }
          assessment.status = RuleDetectionAssessmentStatus.NOT_STARTED;
          screen = renderWithContext();
        });

        it('displays status badge with formatted NOT_STARTED status', () => {
          expect(screen.getByText('Status: Not Started')).toBeInTheDocument();
        });
      });
    });

    describe('duration display', () => {
      describe('when updatedAt is provided', () => {
        beforeEach(() => {
          if (screen) {
            screen.unmount();
          }
          // Mock current time to be 2 hours after updatedAt
          jest.useFakeTimers();
          jest.setSystemTime(new Date('2025-01-01T14:00:00Z'));
          assessment.updatedAt = new Date('2025-01-01T12:00:00Z');
          screen = renderWithContext();
        });

        afterEach(() => {
          jest.useRealTimers();
        });

        it('displays time since last update', () => {
          expect(screen.getByText('2 hours ago')).toBeInTheDocument();
        });
      });

      describe('when updatedAt is not provided', () => {
        beforeEach(() => {
          if (screen) {
            screen.unmount();
          }
          delete (assessment as { updatedAt?: Date }).updatedAt;
          screen = renderWithContext();
        });

        it('does not display duration', () => {
          expect(screen.queryByText(/ago/)).not.toBeInTheDocument();
        });
      });
    });

    describe('auto-close prevention', () => {
      let onCloseSpy: ReturnType<typeof jest.fn>;

      beforeEach(() => {
        onCloseSpy = jest.fn();
        props.onClose = onCloseSpy;
      });

      describe('when status changes to SUCCESS', () => {
        it('prevents auto-close when drawer attempts to close', () => {
          if (screen) {
            screen.unmount();
          }
          assessment.status = RuleDetectionAssessmentStatus.IN_PROGRESS;
          screen = renderWithContext();

          // Simulate status change to SUCCESS
          assessment.status = RuleDetectionAssessmentStatus.SUCCESS;
          screen.rerender(
            <UIProvider>
              <QueryClientProvider client={queryClient}>
                <DetectionAssessmentDrawer {...props} />
              </QueryClientProvider>
            </UIProvider>,
          );

          expect(onCloseSpy).not.toHaveBeenCalled();
        });
      });

      describe('when status is already SUCCESS', () => {
        it('allows closing when drawer close is triggered', async () => {
          if (screen) {
            screen.unmount();
          }
          assessment.status = RuleDetectionAssessmentStatus.SUCCESS;
          screen = renderWithContext();

          const closeButton = screen.getByRole('button', { name: /close/i });
          const user = userEvent.setup();
          await user.click(closeButton);

          expect(onCloseSpy).toHaveBeenCalled();
        });
      });
    });

    describe('success toaster notification', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      describe('when status transitions to SUCCESS', () => {
        it('displays success toaster with correct message', () => {
          if (screen) {
            screen.unmount();
          }
          assessment.status = RuleDetectionAssessmentStatus.IN_PROGRESS;
          screen = renderWithContext();

          // Simulate status change to SUCCESS
          assessment.status = RuleDetectionAssessmentStatus.SUCCESS;
          screen.rerender(
            <UIProvider>
              <QueryClientProvider client={queryClient}>
                <DetectionAssessmentDrawer {...props} />
              </QueryClientProvider>
            </UIProvider>,
          );

          expect(pmToaster.create).toHaveBeenCalledWith({
            type: 'success',
            title: 'Assessment successful!',
            description: 'Program generation has started.',
          });
        });
      });

      describe('when status is already SUCCESS', () => {
        it('does not display toaster on initial render', () => {
          if (screen) {
            screen.unmount();
          }
          assessment.status = RuleDetectionAssessmentStatus.SUCCESS;
          screen = renderWithContext();

          expect(pmToaster.create).not.toHaveBeenCalled();
        });
      });

      describe('when status changes from SUCCESS to another status', () => {
        it('does not display toaster', () => {
          if (screen) {
            screen.unmount();
          }
          assessment.status = RuleDetectionAssessmentStatus.SUCCESS;
          screen = renderWithContext();

          jest.clearAllMocks();

          // Simulate status change from SUCCESS to FAILED
          assessment.status = RuleDetectionAssessmentStatus.FAILED;
          screen.rerender(
            <UIProvider>
              <QueryClientProvider client={queryClient}>
                <DetectionAssessmentDrawer {...props} />
              </QueryClientProvider>
            </UIProvider>,
          );

          expect(pmToaster.create).not.toHaveBeenCalled();
        });
      });
    });
  });
});
