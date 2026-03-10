import { PMBadge, PMHStack, PMIconButton, PMText } from '@packmind/ui';
import { Link } from 'react-router';
import { LuArrowUpRight } from 'react-icons/lu';
import { RelativeTime } from './RelativeTime';

interface ArtefactInfoProps {
  artefactName: string;
  artefactVersion: number;
  latestAuthor: string;
  latestTime: Date;
  artefactLink?: string;
}

export function ArtefactInfo({
  artefactName,
  artefactVersion,
  latestAuthor,
  latestTime,
  artefactLink,
}: Readonly<ArtefactInfoProps>) {
  return (
    <PMHStack gap={2} alignItems="center">
      <PMText fontWeight="bold" fontSize="lg">
        {artefactName}
      </PMText>
      {artefactLink && (
        <Link to={artefactLink}>
          <PMIconButton
            aria-label="Go to artifact page"
            size="xs"
            variant="ghost"
          >
            <LuArrowUpRight />
          </PMIconButton>
        </Link>
      )}
      <PMBadge size="sm" colorPalette="gray">
        Base v{artefactVersion}
      </PMBadge>
      <PMText fontSize="sm" color="secondary">
        {latestAuthor} &middot; <RelativeTime date={latestTime} />
      </PMText>
    </PMHStack>
  );
}
