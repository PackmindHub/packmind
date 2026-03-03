import { PMBadge, PMHStack, PMText } from '@packmind/ui';
import { formatRelativeTime } from '../../utils/formatRelativeTime';

interface ProposalMetaProps {
  authorName: string;
  createdAt: Date;
  artefactVersion: number;
}

export function ProposalMeta({
  authorName,
  createdAt,
  artefactVersion,
}: Readonly<ProposalMetaProps>) {
  return (
    <PMHStack gap={2} alignItems="center">
      <PMText fontSize="xs" color="secondary">
        {authorName} &middot; {formatRelativeTime(createdAt)} &middot;
      </PMText>
      <PMBadge size="sm" colorPalette="gray">
        base v{artefactVersion}
      </PMBadge>
    </PMHStack>
  );
}
