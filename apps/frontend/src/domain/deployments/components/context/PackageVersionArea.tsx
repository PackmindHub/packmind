import { PMBadge, PMButton, PMHStack, PMText, PMVStack } from '@packmind/ui';
import { OrganizationId, PackageId, SpaceId } from '@packmind/types';
import { useListPackageReleasesQuery } from '../../api/queries/DeploymentsQueries';
import {
  PACKAGE_MESSAGES,
  getReleaseVerdictMessage,
} from '../../constants/messages';

export function PackageVersionArea(
  props: Readonly<{
    packageId: PackageId;
    spaceId: SpaceId;
    organizationId: OrganizationId;
    onCreateRelease: () => void;
  }>,
) {
  const { data, isLoading } = useListPackageReleasesQuery(
    props.organizationId,
    props.spaceId,
    props.packageId,
  );

  if (isLoading || !data) {
    return null;
  }

  const { readiness } = data;
  const isReady = readiness.verdict === 'ready';
  const reasonMessage = getReleaseVerdictMessage(
    readiness.verdict,
    readiness.currentVersion,
  );
  const displayVersion =
    readiness.currentVersion || PACKAGE_MESSAGES.release.notReleasedYet;

  return (
    <PMVStack gap={2} align="flex-start" width="100%">
      <PMHStack gap={2} align="center" width="100%">
        <PMBadge variant="outline" colorPalette="blue" size="sm">
          {displayVersion}
        </PMBadge>
        <PMButton
          variant="secondary"
          size="sm"
          onClick={props.onCreateRelease}
          disabled={!isReady}
        >
          Create a release
        </PMButton>
      </PMHStack>

      {reasonMessage && (
        <PMText fontSize="xs" color="secondary">
          {reasonMessage}
        </PMText>
      )}

      {readiness.outdatedComponents.length > 0 && (
        <PMVStack gap={1} width="100%">
          {readiness.outdatedComponents.map((component) => (
            <PMText key={component.id} fontSize="xs" color="secondary">
              {component.name} v{component.pinnedVersion} → v
              {component.latestVersion}
            </PMText>
          ))}
        </PMVStack>
      )}
    </PMVStack>
  );
}
