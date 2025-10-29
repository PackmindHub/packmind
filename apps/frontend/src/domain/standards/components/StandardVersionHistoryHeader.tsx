import { PMHStack, PMText } from '@packmind/ui';
import { Standard, StandardVersion } from '@packmind/shared';
import { formatDistanceToNowStrict } from 'date-fns';

import { StandardVersionsList } from './StandardVersionsList';

interface StandardVersionHistoryHeaderProps {
  standard: Standard;
  versions?: StandardVersion[];
  isLoading: boolean;
  orgSlug?: string;
}

export const StandardVersionHistoryHeader = ({
  standard,
  versions,
  isLoading,
  orgSlug,
}: StandardVersionHistoryHeaderProps) => (
  <PMHStack gap={8} alignItems="center" height="full">
    <PMHStack gap={2} alignItems="center" height="full">
      {standard.updatedAt && (
        <PMText variant="small" color="secondary">
          Last updated:{' '}
          {formatDistanceToNowStrict(new Date(standard.updatedAt))} ago
        </PMText>
      )}
    </PMHStack>
    <PMHStack gap={1} alignItems="center" height="full">
      <PMText variant="small" color="secondary">
        Version:
      </PMText>
      <PMText variant="small">{standard.version}</PMText>
      <StandardVersionsList
        standardId={standard.id}
        versions={versions}
        isLoading={isLoading}
        orgSlug={orgSlug}
        linkLabel="History"
      />
    </PMHStack>
  </PMHStack>
);
