import { PMBox, PMHStack } from '@packmind/ui';
import { ArtefactInfo } from './ArtefactInfo';
import { ViewTabSelector } from './ViewTabSelector';
import { ApplyButton } from './ApplyButton';
import { ReviewTab } from '../../hooks/useCardReviewState';

interface ReviewHeaderProps {
  artefactName: string;
  artefactVersion: number;
  latestAuthor: string;
  latestTime: Date;
  activeTab: ReviewTab;
  onTabChange: (tab: ReviewTab) => void;
  acceptedCount: number;
  hasPooledDecisions: boolean;
  isSaving: boolean;
  onSave: () => void;
}

export function ReviewHeader({
  artefactName,
  artefactVersion,
  latestAuthor,
  latestTime,
  activeTab,
  onTabChange,
  acceptedCount,
  hasPooledDecisions,
  isSaving,
  onSave,
}: Readonly<ReviewHeaderProps>) {
  return (
    <PMBox
      position="sticky"
      top={0}
      zIndex={10}
      bg="bg.panel"
      borderBottom="1px solid"
      borderColor="border.tertiary"
      px={6}
      py={3}
    >
      <PMHStack justifyContent="space-between" alignItems="center">
        <ArtefactInfo
          artefactName={artefactName}
          artefactVersion={artefactVersion}
          latestAuthor={latestAuthor}
          latestTime={latestTime}
        />
        <PMHStack gap={4} alignItems="center">
          <ViewTabSelector activeTab={activeTab} onTabChange={onTabChange} />
          <ApplyButton
            acceptedCount={acceptedCount}
            hasPooledDecisions={hasPooledDecisions}
            isSaving={isSaving}
            onSave={onSave}
          />
        </PMHStack>
      </PMHStack>
    </PMBox>
  );
}
