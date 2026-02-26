import { PMBox, PMHStack } from '@packmind/ui';
import { ArtefactInfo } from './ArtefactInfo';
import { ViewTabSelector } from './ViewTabSelector';
import { ApplyButton } from './ApplyButton';
import { ReviewTab } from '../../hooks/useCommandReviewState';

interface CommandReviewHeaderProps {
  recipeName: string;
  recipeVersion: number;
  latestAuthor: string;
  latestTime: Date;
  activeTab: ReviewTab;
  onTabChange: (tab: ReviewTab) => void;
  acceptedCount: number;
  hasPooledDecisions: boolean;
  isSaving: boolean;
  onSave: () => void;
}

export function CommandReviewHeader({
  recipeName,
  recipeVersion,
  latestAuthor,
  latestTime,
  activeTab,
  onTabChange,
  acceptedCount,
  hasPooledDecisions,
  isSaving,
  onSave,
}: Readonly<CommandReviewHeaderProps>) {
  return (
    <PMBox
      position="sticky"
      top={0}
      zIndex={10}
      bg="bg.panel"
      borderBottom="1px solid"
      borderColor="border.muted"
      px={6}
      py={3}
    >
      <PMHStack justifyContent="space-between" alignItems="center">
        <ArtefactInfo
          recipeName={recipeName}
          recipeVersion={recipeVersion}
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
