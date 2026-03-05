import { PMHStack, PMText } from '@packmind/ui';
import { Standard, StandardVersion } from '@packmind/types';
import { formatDistanceToNowStrict } from 'date-fns';

import { StandardVersionsList } from './StandardVersionsList';
import { PackageCountHeaderInfo } from '../../deployments/components/PackageCountBadge';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';

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
}: StandardVersionHistoryHeaderProps) => {
  const { spaceSlug, spaceId } = useCurrentSpace();
  const { organization } = useAuthContext();

  return (
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
      <PackageCountHeaderInfo
        artifactId={standard.id}
        artifactType="standard"
        orgSlug={orgSlug}
        spaceSlug={spaceSlug}
        spaceId={spaceId}
        organizationId={organization?.id}
      />
    </PMHStack>
  );
};
