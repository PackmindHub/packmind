import type { Meta, StoryObj } from '@storybook/react';
import { DetectionDraftCard } from './DetectionDraftCard';
import {
  DetectionStatus,
  RuleDetectionAssessmentStatus,
  RuleDetectionAssessment,
  DetectionModeEnum,
  ProgrammingLanguage,
  createRuleDetectionAssessmentId,
  createRuleId,
} from '@packmind/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Helper to create a decorator with mocked assessment data
const createQueryMock = (assessmentData?: RuleDetectionAssessment | null) => {
  return (
    Story: React.ComponentType,
    context: {
      args: {
        standardId: string;
        ruleId: string;
        draft: { language: string };
      };
    },
  ) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: Infinity,
        },
      },
    });

    // Pre-populate the query cache with mock assessment data if provided
    if (assessmentData && context.args.draft.language) {
      const queryKey = [
        'organization',
        'detection',
        'get-rule-detection-assessment',
        context.args.standardId,
        context.args.ruleId,
        context.args.draft.language,
      ];
      queryClient.setQueryData(queryKey, assessmentData);
    }

    return (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    );
  };
};

function createMockAssessment(
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

const meta = {
  title: 'Domain/Detection/DetectionDraftCard',
  component: DetectionDraftCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    draft: { control: 'object' },
    isActivating: { control: 'boolean' },
    isGenerating: { control: 'boolean' },
  },
  args: {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onMakeActive: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onTestDraft: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onRetryDraft: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onShowLogs: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onShowProgram: () => {},
    standardId: 'standard-123',
    ruleId: 'rule-456',
  },
  decorators: [],
} satisfies Meta<typeof DetectionDraftCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const baseDraftProgram: any = {
  id: 'draft-program-123',
  ruleId: 'rule-456',
  language: ProgrammingLanguage.TYPESCRIPT,
  status: DetectionStatus.READY,
  code: '',
  sourceCodeState: 'NONE' as const,
  version: 1,
  mode: 'singleAst',
};

const baseDraft = {
  id: 'draft-123',
  language: 'typescript',
  activeDetectionProgramId: 'active-456',
  draftProgram: baseDraftProgram,
  mode: 'AI_GENERATION',
  version: 1,
};

// State: assessing (assessment is NOT_STARTED or IN_PROGRESS)
export const Assessing: Story = {
  args: {
    draft: {
      ...baseDraft,
      status: DetectionStatus.IN_PROGRESS,
    },
  },
  decorators: [
    createQueryMock(
      createMockAssessment(RuleDetectionAssessmentStatus.IN_PROGRESS),
    ),
  ],
};

// State: assessment_failed (assessment status is FAILED)
export const AssessmentFailed: Story = {
  args: {
    draft: {
      ...baseDraft,
      status: DetectionStatus.IN_PROGRESS,
    },
  },
  decorators: [
    createQueryMock(createMockAssessment(RuleDetectionAssessmentStatus.FAILED)),
  ],
};

// State: assessment_successful (assessment SUCCESS but generation not started)
export const AssessmentSuccessful: Story = {
  args: {
    draft: {
      ...baseDraft,
      status: DetectionStatus.TO_REVIEW,
    },
  },
  decorators: [
    createQueryMock(
      createMockAssessment(RuleDetectionAssessmentStatus.SUCCESS),
    ),
  ],
};

// State: generating (assessment SUCCESS and draft status is IN_PROGRESS)
export const Generating: Story = {
  args: {
    draft: {
      ...baseDraft,
      status: DetectionStatus.IN_PROGRESS,
    },
    isGenerating: true,
  },
  decorators: [
    createQueryMock(
      createMockAssessment(RuleDetectionAssessmentStatus.SUCCESS),
    ),
  ],
};

// State: generation_failed (assessment SUCCESS and draft status is FAILURE or ERROR)
export const GenerationFailed: Story = {
  args: {
    draft: {
      ...baseDraft,
      status: DetectionStatus.FAILURE,
    },
  },
  decorators: [
    createQueryMock(
      createMockAssessment(RuleDetectionAssessmentStatus.SUCCESS),
    ),
  ],
};

// State: generation_successful (assessment SUCCESS and draft status is READY)
export const GenerationSuccessful: Story = {
  args: {
    draft: {
      ...baseDraft,
      status: DetectionStatus.READY,
      draftProgram: {
        ...baseDraftProgram,
        sourceCodeState: 'AST' as const,
        code: 'export function detectPattern() { return true; }',
      },
    },
  },
  decorators: [
    createQueryMock(
      createMockAssessment(RuleDetectionAssessmentStatus.SUCCESS),
    ),
  ],
};
