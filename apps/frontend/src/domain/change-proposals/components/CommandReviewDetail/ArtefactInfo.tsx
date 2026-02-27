import { PMBadge, PMHStack, PMText } from '@packmind/ui';
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
    <PMHStack gap={2} alignItems="center">
      <PMText fontWeight="bold" fontSize="lg">
        {recipeName}
      </PMText>
      <PMBadge size="sm" colorPalette="gray">
        Base v{recipeVersion}
      </PMBadge>
      <PMText fontSize="sm" color="secondary">
        {latestAuthor} &middot; {formatRelativeTime(latestTime)}
      </PMText>
    </PMHStack>
  );
}
