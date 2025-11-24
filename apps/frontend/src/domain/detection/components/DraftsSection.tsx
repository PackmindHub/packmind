import React from 'react';
import {
  PMAlert,
  PMEmptyState,
  PMFlex,
  PMPageSection,
  PMSpinner,
} from '@packmind/ui';
import {
  DetectionDraftCard,
  DraftCardData,
} from './DetectionDraftCard/DetectionDraftCard';

const LoadingState = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <PMEmptyState icon={<PMSpinner />} title={title} description={description} />
);

const ErrorState = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <PMAlert.Root status="error">
    <PMAlert.Indicator />
    <PMAlert.Title>{title}</PMAlert.Title>
    <PMAlert.Description>{description}</PMAlert.Description>
  </PMAlert.Root>
);

interface DraftsSectionProps {
  drafts: DraftCardData[];
  isLoading: boolean;
  isError: boolean;
  onMakeActive: (draft: DraftCardData) => void;
  activatingDraftId: string | null;
  isActivatingDraft: boolean;
  onTestDraft: (draft: DraftCardData) => void;
  onRetryDraft: (draft: DraftCardData) => void;
  isGeneratingProgram: boolean;
  standardId: string;
  ruleId: string;
}

export const DraftsSection: React.FC<DraftsSectionProps> = ({
  drafts,
  isLoading,
  isError,
  onMakeActive,
  activatingDraftId,
  isActivatingDraft,
  onTestDraft,
  onRetryDraft,
  isGeneratingProgram,
  standardId,
  ruleId,
}) => {
  if (isLoading) {
    return (
      <PMPageSection title="Drafts" variant="outline">
        <LoadingState
          title="Loading draft configurations"
          description="Please wait while we fetch available drafts."
        />
      </PMPageSection>
    );
  }

  if (isError) {
    return (
      <PMPageSection title="Drafts" variant="outline">
        <ErrorState
          title="Unable to load drafts"
          description="Try again later or re-run the validation CLI command."
        />
      </PMPageSection>
    );
  }

  if (drafts.length === 0) {
    return null;
  }

  return (
    <PMPageSection title="Drafts" variant="outline">
      <PMFlex gap={4} wrap="wrap">
        {drafts.map((draft) => (
          <DetectionDraftCard
            key={draft.id}
            draft={draft}
            onMakeActive={onMakeActive}
            isActivating={activatingDraftId === draft.id && isActivatingDraft}
            onTestDraft={onTestDraft}
            onRetryDraft={onRetryDraft}
            isGenerating={isGeneratingProgram}
            standardId={standardId}
            ruleId={ruleId}
            onShowLogs={function (): void {
              // no-op
            }}
            onShowProgram={function (): void {
              // no-op
            }}
          />
        ))}
      </PMFlex>
    </PMPageSection>
  );
};
