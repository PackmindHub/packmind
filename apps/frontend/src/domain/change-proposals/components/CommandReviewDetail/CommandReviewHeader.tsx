import { ReviewHeader } from '../shared/ReviewHeader';
import type { ReviewTab } from '../../hooks/useCardReviewState';

interface CommandReviewHeaderProps {
  artefactName: string;
  artefactVersion: number;
  latestAuthor: string;
  latestTime: Date;
  activeTab: ReviewTab;
  onTabChange: (tab: ReviewTab) => void;
  acceptedCount: number;
  dismissedCount: number;
  pendingCount: number;
  hasPooledDecisions: boolean;
  isSaving: boolean;
  onSave: () => void;
  artefactLink?: string;
}

export function CommandReviewHeader(props: Readonly<CommandReviewHeaderProps>) {
  return <ReviewHeader {...props} />;
}
