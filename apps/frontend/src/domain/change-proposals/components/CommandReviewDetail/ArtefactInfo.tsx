import { PMBadge, PMHStack, PMText, PMVStack } from '@packmind/ui';
import { formatRelativeTime } from '../../utils/formatRelativeTime';

interface ArtefactInfoProps {
  recipeName: string;
  recipeVersion: number;
  latestAuthor: string;
  latestTime: Date;
}

export function ArtefactInfo({
  recipeName,
  recipeVersion,
  latestAuthor,
  latestTime,
}: Readonly<ArtefactInfoProps>) {
  return (
    <PMVStack gap={1} alignItems="flex-start">
      <PMHStack gap={2} alignItems="center">
        <PMText fontWeight="bold" fontSize="lg">
          {recipeName}
        </PMText>
        <PMBadge size="sm" colorPalette="gray">
          Base v{recipeVersion}
        </PMBadge>
      </PMHStack>
      <PMText fontSize="sm" color="secondary">
        {latestAuthor} &middot; {formatRelativeTime(latestTime)}
      </PMText>
    </PMVStack>
  );
}
