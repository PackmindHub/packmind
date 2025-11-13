import React from 'react';
import {
  PMButton,
  PMEllipsisMenuAction,
  PMText,
  PMTextColors,
} from '@packmind/ui';
import { DetectionProgram } from '@packmind/types';
import { DetectionStatus } from '@packmind/types';
import { ConfigurationCard } from './ConfigurationCard';

const DRAFT_BADGE = {
  label: 'Draft',
  colorPalette: 'gray' as const,
};

const UNKNOWN_STATUS = 'UNKNOWN';

type NormalizedStatus = DetectionStatus | typeof UNKNOWN_STATUS;

const STATUS_CONTENT: Record<
  NormalizedStatus,
  { label: string; color: PMTextColors }
> = {
  [DetectionStatus.READY]: { label: 'Ready', color: 'success' },
  [DetectionStatus.IN_PROGRESS]: {
    label: 'In progress',
    color: 'faded',
  },
  [DetectionStatus.FAILURE]: { label: 'Failure', color: 'error' },
  [DetectionStatus.ERROR]: { label: 'Error', color: 'error' },
  [DetectionStatus.TO_REVIEW]: { label: 'To review', color: 'warning' },
  [UNKNOWN_STATUS]: { label: 'Unknown', color: 'faded' },
};

const RETRYABLE_STATUSES: ReadonlySet<NormalizedStatus> = new Set([
  DetectionStatus.FAILURE,
  DetectionStatus.ERROR,
  DetectionStatus.TO_REVIEW,
  UNKNOWN_STATUS,
]);
const KNOWN_DETECTION_STATUSES = new Set(Object.values(DetectionStatus));

export type DraftCardData = {
  id: string;
  language: string;
  activeDetectionProgramId: string;
  draftProgram: DetectionProgram;
  status: DetectionStatus | string;
  mode?: string;
  version?: number;
};

interface DraftCardProps {
  draft: DraftCardData;
  onMakeActive: (draft: DraftCardData) => void;
  isActivating?: boolean;
  onTestDraft: (draft: DraftCardData) => void;
  onRetryDraft?: (draft: DraftCardData) => void;
  isGenerating?: boolean;
}

export const DetectionDraftCard: React.FC<DraftCardProps> = ({
  draft,
  onMakeActive,
  isActivating = false,
  onTestDraft,
  onRetryDraft,
  isGenerating = false,
}) => {
  const normalizedStatus = normalizeStatus(draft.status);
  const statusContent = STATUS_CONTENT[normalizedStatus];
  const menuActions = buildMenuActions({
    draft,
    normalizedStatus,
    onMakeActive,
    onTestDraft,
  });
  const mainAction = buildMainAction({
    draft,
    normalizedStatus,
    onRetryDraft,
    isGenerating,
    isActivating,
  });

  return (
    <ConfigurationCard
      id={draft.id}
      language={draft.language}
      badge={DRAFT_BADGE}
      menuActions={menuActions}
      mainAction={mainAction}
      actionsDisabled={isActivating}
    >
      <PMText fontSize="sm">
        Status:{' '}
        <PMText color={statusContent.color}>{statusContent.label}</PMText>{' '}
      </PMText>
      <PMText color="faded" fontSize="sm">
        Version {draft.version ?? '—'}
      </PMText>
    </ConfigurationCard>
  );
};

function normalizeStatus(status: DraftCardData['status']): NormalizedStatus {
  if (typeof status !== 'string') {
    return UNKNOWN_STATUS;
  }

  const parsedStatus = status.toUpperCase();

  return isKnownDetectionStatus(parsedStatus) ? parsedStatus : UNKNOWN_STATUS;
}

function isKnownDetectionStatus(status: string): status is DetectionStatus {
  return KNOWN_DETECTION_STATUSES.has(status as DetectionStatus);
}

function buildMenuActions({
  draft,
  normalizedStatus,
  onMakeActive,
  onTestDraft,
}: {
  draft: DraftCardData;
  normalizedStatus: NormalizedStatus;
  onMakeActive: (draft: DraftCardData) => void;
  onTestDraft: (draft: DraftCardData) => void;
}): PMEllipsisMenuAction[] {
  const actions: PMEllipsisMenuAction[] = [];

  if (normalizedStatus === DetectionStatus.READY) {
    actions.push({
      value: 'make-active',
      content: <PMText color="secondary">Mark as active</PMText>,
      onClick: () => onMakeActive(draft),
    });
  }

  if (canTestDraftProgram(draft, normalizedStatus)) {
    actions.push({
      value: 'test-draft',
      content: <PMText color="secondary">Test draft</PMText>,
      onClick: () => onTestDraft(draft),
    });
  }

  return actions;
}

function buildMainAction({
  draft,
  normalizedStatus,
  onRetryDraft,
  isGenerating,
  isActivating,
}: {
  draft: DraftCardData;
  normalizedStatus: NormalizedStatus;
  onRetryDraft?: (draft: DraftCardData) => void;
  isGenerating: boolean;
  isActivating: boolean;
}): React.ReactNode {
  if (!onRetryDraft || !RETRYABLE_STATUSES.has(normalizedStatus)) {
    return undefined;
  }

  return (
    <PMButton
      size="sm"
      variant="outline"
      onClick={() => onRetryDraft(draft)}
      loading={isGenerating}
      disabled={isGenerating || isActivating}
    >
      Retry
    </PMButton>
  );
}

function canTestDraftProgram(
  draft: DraftCardData,
  normalizedStatus: NormalizedStatus,
): boolean {
  if (normalizedStatus !== DetectionStatus.READY) {
    return false;
  }

  const sourceState = draft.draftProgram.sourceCodeState;
  const hasExecutableSource = sourceState !== 'NONE';
  const hasCode = draft.draftProgram.code.trim().length > 0;

  return hasExecutableSource && hasCode;
}
