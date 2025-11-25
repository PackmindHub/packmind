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
import { DetectionDraftMenu } from './DetectionDraftMenu';
import { DraftCardData } from './DetectionDraftCard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@packmind/ui';
import * as DetectionProgramQueries from '../../api/queries/DetectionProgramQueries';

jest.mock('../../api/queries/DetectionProgramQueries');

describe('DetectionDraftMenu', () => {
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

    return render(
      <UIProvider>
        <QueryClientProvider client={queryClient}>
          <DetectionDraftMenu
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

  describe('menu label', () => {
    describe('when state is ASSESSING', () => {
      beforeEach(() => {
        screen = renderWithContext(
          createAssessment(RuleDetectionAssessmentStatus.IN_PROGRESS),
        );
      });

      it('displays "Draft: Pending"', () => {
        expect(screen.getByText('Draft: Pending')).toBeInTheDocument();
      });
    });

    describe('when state is ASSESSMENT_FAILED', () => {
      beforeEach(() => {
        screen = renderWithContext(
          createAssessment(RuleDetectionAssessmentStatus.FAILED),
        );
      });

      it('displays "Draft: Error"', () => {
        expect(screen.getByText('Draft: Error')).toBeInTheDocument();
      });
    });

    describe('when state is ASSESSMENT_SUCCESSFUL', () => {
      beforeEach(() => {
        baseDraft.status = DetectionStatus.TO_REVIEW;
        screen = renderWithContext(
          createAssessment(RuleDetectionAssessmentStatus.SUCCESS),
        );
      });

      it('displays "Draft: Pending"', () => {
        expect(screen.getByText('Draft: Pending')).toBeInTheDocument();
      });
    });

    describe('when state is GENERATING', () => {
      beforeEach(() => {
        baseDraft.status = DetectionStatus.IN_PROGRESS;
        screen = renderWithContext(
          createAssessment(RuleDetectionAssessmentStatus.SUCCESS),
        );
      });

      it('displays "Draft: Pending"', () => {
        expect(screen.getByText('Draft: Pending')).toBeInTheDocument();
      });
    });

    describe('when state is GENERATION_FAILED', () => {
      beforeEach(() => {
        baseDraft.status = DetectionStatus.FAILURE;
        screen = renderWithContext(
          createAssessment(RuleDetectionAssessmentStatus.SUCCESS),
        );
      });

      it('displays "Draft: Error"', () => {
        expect(screen.getByText('Draft: Error')).toBeInTheDocument();
      });
    });

    describe('when state is GENERATION_SUCCESSFUL', () => {
      beforeEach(() => {
        baseDraft.status = DetectionStatus.READY;
        screen = renderWithContext(
          createAssessment(RuleDetectionAssessmentStatus.SUCCESS),
        );
      });

      it('displays "Draft: OK"', () => {
        expect(screen.getByText('Draft: OK')).toBeInTheDocument();
      });
    });
  });

  describe('menu actions', () => {
    describe('when state is GENERATING', () => {
      beforeEach(() => {
        baseDraft.status = DetectionStatus.IN_PROGRESS;
        screen = renderWithContext(
          createAssessment(RuleDetectionAssessmentStatus.SUCCESS),
        );
      });

      it('shows "Show log" action in menu', async () => {
        const trigger = screen.getByText('Draft: Pending');
        fireEvent.click(trigger);

        await waitFor(() => {
          const menuItems = screen.getAllByText('Show log');
          expect(menuItems.length).toBeGreaterThan(0);
        });
      });

      it('calls onShowLogs when "Show log" is clicked', async () => {
        const trigger = screen.getByText('Draft: Pending');
        fireEvent.click(trigger);

        await waitFor(() => {
          const showLogItem = screen.getAllByText('Show log')[0];
          fireEvent.click(showLogItem);
        });

        expect(onShowLogs).toHaveBeenCalled();
      });
    });

    describe('when state is GENERATION_FAILED', () => {
      beforeEach(() => {
        baseDraft.status = DetectionStatus.FAILURE;
        screen = renderWithContext(
          createAssessment(RuleDetectionAssessmentStatus.SUCCESS),
        );
      });

      it('shows "Retry" and "Show log" actions in menu', async () => {
        const trigger = screen.getByText('Draft: Error');
        fireEvent.click(trigger);

        await waitFor(() => {
          expect(screen.getByText('Retry')).toBeInTheDocument();
          const showLogItems = screen.getAllByText('Show log');
          expect(showLogItems.length).toBeGreaterThan(0);
        });
      });

      it('calls onRetryDraft when "Retry" is clicked', async () => {
        const trigger = screen.getByText('Draft: Error');
        fireEvent.click(trigger);

        await waitFor(() => {
          const retryItem = screen.getByText('Retry');
          fireEvent.click(retryItem);
        });

        expect(onRetryDraft).toHaveBeenCalledWith(baseDraft);
      });
    });

    describe('when state is GENERATION_SUCCESSFUL', () => {
      beforeEach(() => {
        baseDraft.status = DetectionStatus.READY;
        screen = renderWithContext(
          createAssessment(RuleDetectionAssessmentStatus.SUCCESS),
        );
      });

      it('shows all available actions in menu', async () => {
        const trigger = screen.getByText('Draft: OK');
        fireEvent.click(trigger);

        await waitFor(() => {
          expect(screen.getByText('Show log')).toBeInTheDocument();
          expect(screen.getByText('Show program')).toBeInTheDocument();
          expect(screen.getByText('Test draft program')).toBeInTheDocument();
          expect(screen.getByText('Set as active')).toBeInTheDocument();
        });
      });

      it('calls onShowProgram when "Show program" is clicked', async () => {
        const trigger = screen.getByText('Draft: OK');
        fireEvent.click(trigger);

        await waitFor(() => {
          const showProgramItem = screen.getByText('Show program');
          fireEvent.click(showProgramItem);
        });

        expect(onShowProgram).toHaveBeenCalled();
      });

      it('calls onTestDraft when "Test draft program" is clicked', async () => {
        const trigger = screen.getByText('Draft: OK');
        fireEvent.click(trigger);

        await waitFor(() => {
          const testDraftItem = screen.getByText('Test draft program');
          fireEvent.click(testDraftItem);
        });

        expect(onTestDraft).toHaveBeenCalledWith(baseDraft);
      });

      it('calls onMakeActive when "Set as active" is clicked', async () => {
        const trigger = screen.getByText('Draft: OK');
        fireEvent.click(trigger);

        await waitFor(() => {
          const setActiveItem = screen.getByText('Set as active');
          fireEvent.click(setActiveItem);
        });

        expect(onMakeActive).toHaveBeenCalledWith(baseDraft);
      });
    });
  });
});
