import { DetectionProgram } from '@packmind/types';
import { DraftCardData } from '../DetectionDraftCard/DetectionDraftCard';

export enum ActiveConfigurationState {
  OK = 'ok',
  TO_REVIEW = 'toReview',
  NO_CONFIG = 'noConfig',
  IN_PROGRESS = 'inProgress',
  ERROR = 'error',
}

export type ActiveConfigurationSectionData = {
  id: string;
  language: string;
  detectionProgram: DetectionProgram | null | undefined;
  draftProgram: DetectionProgram | null | undefined;
  state: ActiveConfigurationState;
  isExampleOnly?: boolean;
  isToReview?: boolean;
};

// Keep old name as alias for backward compatibility during migration
export type ActiveConfigurationCardData = ActiveConfigurationSectionData;

export type ActiveConfigurationSectionProps = {
  configuration: ActiveConfigurationSectionData;
  onGenerateProgram?: (language: string) => void;
  isGenerating?: boolean;
  standardId: string;
  standardName?: string;
  ruleId: string;
  onTestProgram: (program: ActiveConfigurationSectionData) => void;
  onActivateDraft?: (draft: DraftCardData) => void;
  activatingDraftId?: string | null;
  isActivatingDraft?: boolean;
  onOpenAssessmentDrawer: (language: string) => void;
};

// Keep old name as alias for backward compatibility during migration
export type ActiveConfigurationCardProps = ActiveConfigurationSectionProps;
