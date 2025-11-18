import type { Meta, StoryObj } from '@storybook/react';
import { DetectionDraftCard } from './DetectionDraftCard';
import { DetectionStatus } from '@packmind/types';
import { ProgrammingLanguage } from '@packmind/types';

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
    standardId: 'standard-123',
    ruleId: 'rule-456',
  },
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

export const ReadyWithTestableCode: Story = {
  args: {
    draft: {
      ...baseDraft,
      status: DetectionStatus.READY,
      draftProgram: {
        ...baseDraftProgram,
        sourceCodeState: 'AST' as const,
        code: 'export function detectPattern() { return true; }',
      },
      version: 2,
    },
  },
};

export const InProgress: Story = {
  args: {
    draft: {
      ...baseDraft,
      status: DetectionStatus.IN_PROGRESS,
    },
  },
};

export const Failure: Story = {
  args: {
    draft: {
      ...baseDraft,
      status: DetectionStatus.FAILURE,
      version: 3,
    },
  },
};

export const Error: Story = {
  args: {
    draft: {
      ...baseDraft,
      status: DetectionStatus.ERROR,
    },
  },
};

export const ToReview: Story = {
  args: {
    draft: {
      ...baseDraft,
      status: DetectionStatus.TO_REVIEW,
      draftProgram: {
        ...baseDraftProgram,
        sourceCodeState: 'AST' as const,
        code: 'export function detectPattern() { return true; }',
      },
    },
  },
};

export const UnknownStatus: Story = {
  args: {
    draft: {
      ...baseDraft,
      status: 'INVALID_STATUS',
    },
  },
};

export const ReadyActivating: Story = {
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
    isActivating: true,
  },
};

export const NoVersion: Story = {
  args: {
    draft: {
      ...baseDraft,
      status: DetectionStatus.READY,
      version: undefined,
    },
  },
};
