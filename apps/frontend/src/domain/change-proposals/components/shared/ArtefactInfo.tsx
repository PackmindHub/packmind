import { PMBadge, PMHStack, PMText } from '@packmind/ui';
import { RelativeTime } from './RelativeTime';

interface ArtefactInfoProps {
  artefactName: string;
  artefactVersion: number;
  latestAuthor: string;
  latestTime: Date;
}

export function ArtefactInfo({
  artefactName,
  artefactVersion,
  latestAuthor,
  latestTime,
}: Readonly<ArtefactInfoProps>) {
  return (
    <PMHStack gap={2} alignItems="center">
      <PMText fontWeight="bold" fontSize="lg">
        {artefactName}
      </PMText>
      <PMBadge size="sm" colorPalette="gray">
        Base v{artefactVersion}
      </PMBadge>
      <PMText fontSize="sm" color="secondary">
        {latestAuthor} &middot; <RelativeTime date={latestTime} />
      </PMText>
    </PMHStack>
  );
}
