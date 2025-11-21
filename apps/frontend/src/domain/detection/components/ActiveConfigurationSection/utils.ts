import { IPMButtonProps } from '@packmind/ui';
import { DetectionStatus } from '@packmind/types';
import { ActiveConfigurationSectionProps } from './types';
import { DraftCardData } from '../DetectionDraftCard';

export function getToReviewMainAction({
  configuration,
  onGenerateProgram,
  onActivateDraft,
  isGenerating,
  isActivatingDraft,
}: Pick<
  ActiveConfigurationSectionProps,
  | 'configuration'
  | 'onGenerateProgram'
  | 'onActivateDraft'
  | 'isGenerating'
  | 'isActivatingDraft'
>): IPMButtonProps | null {
  if (!onGenerateProgram || !onActivateDraft) {
    return null;
  }

  const draftProgram = configuration.draftProgram ?? null;
  if (!draftProgram) {
    return {
      onClick: () => onGenerateProgram(configuration.language),
      children: 'New draft',
      loading: isGenerating,
      disabled: isGenerating,
    };
  }

  const draftCard: DraftCardData = {
    id: `${configuration.id}-draft-${draftProgram.id}`,
    language: draftProgram.language ?? configuration.language,
    activeDetectionProgramId: configuration.id,
    draftProgram,
    status: draftProgram.status,
    mode: draftProgram.mode,
    version: draftProgram.version,
  };

  if (draftProgram?.status === DetectionStatus.READY) {
    return {
      onClick: () => onActivateDraft(draftCard),
      children: 'Activate draft',
      loading: isActivatingDraft,
      disabled: isActivatingDraft,
    };
  }

  if (draftProgram.status === DetectionStatus.TO_REVIEW) {
    return {
      onClick: () => onGenerateProgram(configuration.language),
      children: 'Update draft',
      loading: isGenerating,
      disabled: isGenerating,
    };
  }

  return {
    onClick: () => onGenerateProgram(configuration.language),
    children: 'Retry draft',
    loading: isGenerating,
    disabled: isGenerating,
  };
}
