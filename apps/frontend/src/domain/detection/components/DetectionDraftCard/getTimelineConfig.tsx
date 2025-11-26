import { DraftStatus } from './determineDraftStatus';
import { IPMButtonProps, PMText } from '@packmind/ui';
import React from 'react';
import {
  LuFileText,
  LuCode,
  LuPlay,
  LuCircleCheckBig,
  LuRefreshCw,
} from 'react-icons/lu';

type TimelineButtonConfirmation = {
  title: string;
  message: string;
  confirmText?: string;
};

export type TimelineButton = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  variant?: IPMButtonProps['variant'];
  size?: IPMButtonProps['size'];
  confirmation?: TimelineButtonConfirmation;
};

export enum TimelineStepStatus {
  pending,
  success,
  failure,
  unreachable,
}

export type TimelineStepConfig = {
  title: string;
  description?: string | React.ReactNode;
  isLast: boolean;
  buttons?: TimelineButton[];
  status: TimelineStepStatus;
};

type TimelineConfig = {
  step1: TimelineStepConfig;
  step2: TimelineStepConfig;
  step3: TimelineStepConfig;
};
export type TimelineHandlers = {
  onShowLogs: () => void;
  onShowProgram: () => void;
  onTestDraft: () => void;
  onMakeActive: () => void;
  onRetryDraft: () => void;
};
export type LoadingStates = {
  isActivating: boolean;
  isGenerating: boolean;
};

export type DraftInfo = {
  language: string;
  version?: number;
  hasActiveProgram: boolean;
};

export function getTimelineConfig(
  state: DraftStatus,
  handlers: TimelineHandlers,
  loadingStates: LoadingStates,
  draftInfo?: DraftInfo,
): TimelineConfig {
  switch (state) {
    case DraftStatus.ASSESSING:
      return {
        step1: {
          title: 'Checking the detectability of the rule',
          isLast: false,
          status: TimelineStepStatus.pending,
        },
        step2: {
          title: 'Generating program',
          isLast: false,
          status: TimelineStepStatus.unreachable,
        },
        step3: {
          title: 'Ready to use',
          isLast: true,
          status: TimelineStepStatus.unreachable,
        },
      };

    case DraftStatus.ASSESSMENT_FAILED:
      return {
        step1: {
          title: 'The rule can not be detected',
          isLast: false,
          status: TimelineStepStatus.failure,
        },
        step2: {
          title: 'Generating program',
          isLast: false,
          status: TimelineStepStatus.unreachable,
        },
        step3: {
          title: 'Ready to use',
          isLast: true,
          status: TimelineStepStatus.unreachable,
        },
      };

    case DraftStatus.ASSESSMENT_SUCCESSFUL:
      return {
        step1: {
          title: 'The rule can be detected',
          isLast: false,
          status: TimelineStepStatus.success,
        },
        step2: {
          title: 'Generating program',
          description: (
            <>
              <PMText as="p" variant="small">
                Packmind AI generates a program that comply with rule
                specifications. Program is ran on code examples to ensure its
                validity.
              </PMText>
              <PMText as="p" color="faded" variant="small">
                Note: generation can take more than a minute to finish.
              </PMText>
            </>
          ),
          isLast: false,
          status: TimelineStepStatus.pending,
        },
        step3: {
          title: 'Ready to use',
          isLast: true,
          status: TimelineStepStatus.unreachable,
        },
      };

    case DraftStatus.GENERATING:
      return {
        step1: {
          title: 'The rule can be detected',
          isLast: false,
          status: TimelineStepStatus.success,
        },
        step2: {
          title: 'Generating program',
          description: (
            <>
              <PMText as="p" variant="small">
                Packmind AI generates a program that comply with rule
                specifications. Program is ran on code examples to ensure its
                validity.
              </PMText>
              <PMText as="p" color="faded" variant="small">
                Note: generation can take more than a minute to finish.
              </PMText>
            </>
          ),
          isLast: false,
          status: TimelineStepStatus.pending,
          buttons: [
            {
              label: 'Show log',
              onClick: handlers.onShowLogs,
              variant: 'tertiary',
              size: '2xs',
              icon: <LuFileText />,
            },
          ],
        },
        step3: {
          title: 'Ready to use',
          isLast: true,
          status: TimelineStepStatus.unreachable,
        },
      };

    case DraftStatus.GENERATION_FAILED:
      return {
        step1: {
          title: 'The rule can be detected',
          isLast: false,
          status: TimelineStepStatus.success,
        },
        step2: {
          title: 'Unable to generate a program',
          isLast: false,
          status: TimelineStepStatus.failure,
          buttons: [
            {
              label: 'Retry',
              onClick: handlers.onRetryDraft,
              disabled: loadingStates.isGenerating,
              size: '2xs',
              icon: <LuRefreshCw />,
            },
            {
              label: 'Show log',
              onClick: handlers.onShowLogs,
              variant: 'tertiary',
              size: '2xs',
              icon: <LuFileText />,
            },
          ],
        },
        step3: {
          title: 'Ready to use',
          isLast: true,
          status: TimelineStepStatus.unreachable,
        },
      };

    case DraftStatus.GENERATION_SUCCESSFUL:
      return {
        step1: {
          title: 'The rule can be detected',
          isLast: false,
          status: TimelineStepStatus.success,
        },
        step2: {
          title: 'Program has been generated',
          isLast: false,
          status: TimelineStepStatus.success,
          buttons: [
            {
              label: 'Show log',
              onClick: handlers.onShowLogs,
              variant: 'tertiary',
              size: '2xs',
              icon: <LuFileText />,
            },
            {
              label: 'Show program',
              onClick: handlers.onShowProgram,
              variant: 'tertiary',
              size: '2xs',
              icon: <LuCode />,
            },
          ],
        },
        step3: {
          title: 'Ready to use',
          isLast: true,
          status: TimelineStepStatus.success,
          buttons: [
            {
              label: 'Test draft program',
              onClick: handlers.onTestDraft,
              icon: <LuPlay />,
            },
            {
              label: 'Set as active',
              onClick: handlers.onMakeActive,
              disabled: loadingStates.isActivating,
              icon: <LuCircleCheckBig />,
              variant: 'primary',
              confirmation: draftInfo?.hasActiveProgram
                ? {
                    title: 'Activate Detection Program',
                    message: `Are you sure you want to activate this ${draftInfo.language} detection program${draftInfo.version ? ` (v${draftInfo.version})` : ''}? This will replace the current active program.`,
                    confirmText: 'Activate',
                  }
                : undefined,
            },
          ],
        },
      };
  }
}
