import { PMBadge, PMBox, PMHStack, PMText } from '@packmind/ui';
import { PreviewArtifactRenderingCommand } from '@packmind/types';
import { RelativeTime } from './RelativeTime';
import { ReviewActionButtons } from '../ReviewActionButtons';
import { DownloadAsAgentButton } from './DownloadAsAgentButton';

interface CreationReviewHeaderProps {
  artefactName: string;
  latestAuthor: string;
  latestTime: Date;
  onAccept: () => void;
  onDismiss: () => void;
  isPending: boolean;
  isSubmitted: boolean;
  getPreviewCommand?: () => Omit<
    PreviewArtifactRenderingCommand,
    'codingAgent'
  >;
}

export function CreationReviewHeader({
  artefactName,
  latestAuthor,
  latestTime,
  onAccept,
  onDismiss,
  isPending,
  isSubmitted,
  getPreviewCommand,
}: Readonly<CreationReviewHeaderProps>) {
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
        <PMHStack gap={2} alignItems="center">
          <PMText fontWeight="bold" fontSize="lg">
            {artefactName}
          </PMText>
          <PMBadge size="sm" colorPalette="gray">
            New
          </PMBadge>
          <PMText fontSize="sm" color="secondary">
            {latestAuthor} &middot; <RelativeTime date={latestTime} />
          </PMText>
        </PMHStack>
        {!isSubmitted && (
          <PMHStack gap={2}>
            {getPreviewCommand && (
              <DownloadAsAgentButton
                getPreviewCommand={getPreviewCommand}
                size="xs"
              />
            )}
            <ReviewActionButtons
              onAccept={onAccept}
              onDismiss={onDismiss}
              isPending={isPending}
            />
          </PMHStack>
        )}
      </PMHStack>
    </PMBox>
  );
}
