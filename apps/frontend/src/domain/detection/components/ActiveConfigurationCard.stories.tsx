import type { Meta, StoryObj } from '@storybook/react';
import {
  ActiveConfigurationCard,
  ActiveConfigurationState,
} from './ActiveConfigurationCard';
import {
  createDetectionProgramId,
  createRuleId,
  DetectionModeEnum,
  DetectionStatus,
} from '@packmind/types';
import { ProgrammingLanguage } from '@packmind/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Helper to create a decorator with mocked query data
const createQueryMock = (assessmentData?: {
  status: string;
  details?: string;
}) => {
  return (
    Story: React.ComponentType,
    context: {
      args: {
        standardId: string;
        ruleId: string;
        configuration: { language: string };
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

    // Pre-populate the query cache with mock data if provided
    if (assessmentData && context.args.configuration.language) {
      const queryKey = [
        'organization',
        'detection',
        'get-rule-detection-assessment',
        context.args.standardId,
        context.args.ruleId,
        context.args.configuration.language,
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

const meta = {
  title: 'Domain/Detection/ActiveConfigurationCard',
  component: ActiveConfigurationCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    configuration: { control: 'object' },
    isGenerating: { control: 'boolean' },
    isActivatingDraft: { control: 'boolean' },
    standardId: { control: 'text' },
    ruleId: { control: 'text' },
  },
  args: {
    standardId: 'standard-123',
    ruleId: 'rule-456',
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onGenerateProgram: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onTestProgram: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onActivateDraft: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onOpenAssessmentDrawer: () => {},
  },
  decorators: [],
} satisfies Meta<typeof ActiveConfigurationCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const baseDetectionProgram: any = {
  id: 'program-123',
  ruleId: 'rule-456',
  language: ProgrammingLanguage.TYPESCRIPT,
  status: DetectionStatus.READY,
  code: 'export function detectPattern() { return true; }',
  sourceCodeState: 'AST' as const,
  version: 1,
  mode: 'singleAst',
};

const baseConfiguration = {
  id: 'config-123',
  language: 'typescript',
  detectionProgram: null,
  draftProgram: null,
};

// View Miro board for various cases: https://miro.com/app/board/uXjVJ5RP_vU=/?moveToWidget=3458764644640092894&cot=14

export const NoAssessment: Story = {
  args: {
    configuration: {
      ...baseConfiguration,
      state: ActiveConfigurationState.NO_CONFIG,
      detectionProgram: null,
    },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onGenerateProgram: () => {},
  },
  decorators: [],
};

export const FailedAssessment: Story = {
  args: {
    configuration: {
      ...baseConfiguration,
      state: ActiveConfigurationState.NO_CONFIG,
      detectionProgram: null,
    },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onGenerateProgram: () => {},
  },
  decorators: [
    createQueryMock({
      status: 'FAILED',
      details: 'Assessment process encountered an error.',
    }),
  ],
};

export const SuccessfulAssessment: Story = {
  args: {
    configuration: {
      ...baseConfiguration,
      state: ActiveConfigurationState.NO_CONFIG,
      detectionProgram: null,
    },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onGenerateProgram: () => {},
  },
  decorators: [
    createQueryMock({
      status: 'DONE',
      details: 'Assessment process encountered an error.',
    }),
  ],
};

export const InProgress: Story = {
  args: {
    configuration: {
      ...baseConfiguration,
      state: ActiveConfigurationState.IN_PROGRESS,
      detectionProgram: null,
    },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onGenerateProgram: () => {},
  },
  decorators: [
    createQueryMock({
      status: 'DONE',
      details: 'Assessment process encountered an error.',
    }),
  ],
};

export const ProgramToReviewWithoutDraft: Story = {
  args: {
    configuration: {
      ...baseConfiguration,
      state: ActiveConfigurationState.TO_REVIEW,
      detectionProgram: {
        id: createDetectionProgramId('some-program-id'),
        code: '',
        version: 5,
        mode: DetectionModeEnum.REGEXP,
        ruleId: createRuleId('123'),
        language: ProgrammingLanguage.JAVASCRIPT,
        status: DetectionStatus.READY,
        sourceCodeState: 'AST',
      },
    },
    onGenerateProgram: () => {
      console.log(`New program generated`);
    },
    onActivateDraft: (draftCard?) => {
      console.log(`Activating draft: ${draftCard};`);
    },
  },
  decorators: [
    createQueryMock({
      status: 'DONE',
      details: 'Assessment process encountered an error.',
    }),
  ],
};

export const ProgramToReviewWithSuccessfulDraft: Story = {
  args: {
    configuration: {
      ...baseConfiguration,
      state: ActiveConfigurationState.TO_REVIEW,
      detectionProgram: {
        id: createDetectionProgramId('some-program-id'),
        code: '',
        version: 5,
        mode: DetectionModeEnum.REGEXP,
        ruleId: createRuleId('123'),
        language: ProgrammingLanguage.JAVASCRIPT,
        status: DetectionStatus.READY,
        sourceCodeState: 'AST',
      },
      draftProgram: {
        id: createDetectionProgramId('some-draft-id'),
        code: '',
        version: 5,
        mode: DetectionModeEnum.REGEXP,
        ruleId: createRuleId('123'),
        language: ProgrammingLanguage.JAVASCRIPT,
        status: DetectionStatus.READY,
        sourceCodeState: 'AST',
      },
    },
    onGenerateProgram: () => {
      console.log(`New program generated`);
    },
    onActivateDraft: (draftCard?) => {
      console.log(`Activating draft: ${draftCard};`);
    },
  },
  decorators: [
    createQueryMock({
      status: 'DONE',
      details: 'Assessment process encountered an error.',
    }),
  ],
};

export const ProgramToReviewWithToReviewDraft: Story = {
  args: {
    configuration: {
      ...baseConfiguration,
      state: ActiveConfigurationState.TO_REVIEW,
      detectionProgram: {
        id: createDetectionProgramId('some-program-id'),
        code: '',
        version: 5,
        mode: DetectionModeEnum.REGEXP,
        ruleId: createRuleId('123'),
        language: ProgrammingLanguage.JAVASCRIPT,
        status: DetectionStatus.READY,
        sourceCodeState: 'AST',
      },
      draftProgram: {
        id: createDetectionProgramId('some-draft-id'),
        code: '',
        version: 5,
        mode: DetectionModeEnum.REGEXP,
        ruleId: createRuleId('123'),
        language: ProgrammingLanguage.JAVASCRIPT,
        status: DetectionStatus.TO_REVIEW,
        sourceCodeState: 'AST',
      },
    },
    onGenerateProgram: () => {
      console.log(`New program generated`);
    },
    onActivateDraft: (draftCard?) => {
      console.log(`Activating draft: ${draftCard};`);
    },
  },
  decorators: [
    createQueryMock({
      status: 'DONE',
      details: 'Assessment process encountered an error.',
    }),
  ],
};

export const ProgramOk: Story = {
  args: {
    configuration: {
      ...baseConfiguration,
      state: ActiveConfigurationState.OK,
      detectionProgram: {
        id: createDetectionProgramId('some-program-id'),
        code: '',
        version: 5,
        mode: DetectionModeEnum.REGEXP,
        ruleId: createRuleId('123'),
        language: ProgrammingLanguage.JAVASCRIPT,
        status: DetectionStatus.READY,
        sourceCodeState: 'AST',
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onGenerateProgram: () => {},
  },
  decorators: [
    createQueryMock({
      status: 'DONE',
      details: 'Assessment process encountered an error.',
    }),
  ],
};
