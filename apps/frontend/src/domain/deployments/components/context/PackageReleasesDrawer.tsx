import { useState } from 'react';
import {
  PMButton,
  PMCloseButton,
  PMDrawer,
  PMHeading,
  PMPortal,
  PMText,
  PMVStack,
  PMBox,
} from '@packmind/ui';
import {
  OrganizationId,
  PackageId,
  SpaceId,
  parsePackageReleaseVersion,
  comparePackageReleaseVersions,
  PackageReleaseSummary,
} from '@packmind/types';
import { useGetPackageReleaseQuery } from '../../api/queries/DeploymentsQueries';

export function PackageReleasesDrawer({
  releases,
  packageId,
  spaceId,
  organizationId,
  open,
  onOpenChange,
}: Readonly<{
  releases: PackageReleaseSummary[];
  packageId: PackageId;
  spaceId: SpaceId;
  organizationId: OrganizationId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const [selectedVersion, setSelectedVersion] = useState<string | undefined>();

  const { data: releaseData, isLoading } = useGetPackageReleaseQuery(
    organizationId,
    spaceId,
    packageId,
    selectedVersion,
  );

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setSelectedVersion(undefined);
    }
  };

  // Sort releases by version, newest first
  const sortedReleases = [...releases]
    .map((r) => ({
      ...r,
      parsed: parsePackageReleaseVersion(r.version),
    }))
    .filter(
      (r): r is typeof r & { parsed: NonNullable<typeof r.parsed> } =>
        r.parsed !== null,
    )
    .sort((a, b) => comparePackageReleaseVersions(b.parsed, a.parsed))
    .map((r) => r.version);

  return (
    <PMDrawer.Root
      open={open}
      onOpenChange={(details) => handleOpenChange(details.open)}
      closeOnInteractOutside={!isLoading}
      placement="end"
      size="lg"
    >
      <PMPortal>
        <PMDrawer.Backdrop />
        <PMDrawer.Positioner>
          <PMDrawer.Content>
            <PMDrawer.Header>
              <PMHeading size="md">Release history</PMHeading>
            </PMDrawer.Header>

            <PMDrawer.Body padding={5}>
              {selectedVersion && releaseData ? (
                <PMVStack gap={5} alignItems="stretch">
                  <PMVStack gap={2} alignItems="stretch">
                    <PMText fontSize="sm" fontWeight="bold">
                      {selectedVersion}
                    </PMText>
                    <PMText fontSize="xs" color="secondary">
                      {releaseData.release.description || 'No description'}
                    </PMText>
                  </PMVStack>

                  <PMVStack gap={3} alignItems="stretch">
                    {releaseData.release.recipeVersions.length > 0 && (
                      <PMVStack gap={2} alignItems="stretch">
                        <PMText
                          fontSize="xs"
                          fontWeight="bold"
                          color="secondary"
                        >
                          Commands
                        </PMText>
                        {releaseData.release.recipeVersions.map((cmd) => (
                          <PMText key={cmd.id} fontSize="xs">
                            {cmd.name} v{cmd.version}
                          </PMText>
                        ))}
                      </PMVStack>
                    )}

                    {releaseData.release.standardVersions.length > 0 && (
                      <PMVStack gap={2} alignItems="stretch">
                        <PMText
                          fontSize="xs"
                          fontWeight="bold"
                          color="secondary"
                        >
                          Standards
                        </PMText>
                        {releaseData.release.standardVersions.map((std) => (
                          <PMText key={std.id} fontSize="xs">
                            {std.name} v{std.version}
                          </PMText>
                        ))}
                      </PMVStack>
                    )}

                    {releaseData.release.skillVersions.length > 0 && (
                      <PMVStack gap={2} alignItems="stretch">
                        <PMText
                          fontSize="xs"
                          fontWeight="bold"
                          color="secondary"
                        >
                          Skills
                        </PMText>
                        {releaseData.release.skillVersions.map((skill) => (
                          <PMText key={skill.id} fontSize="xs">
                            {skill.name} v{skill.version}
                          </PMText>
                        ))}
                      </PMVStack>
                    )}
                  </PMVStack>

                  <PMButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedVersion(undefined)}
                  >
                    Back
                  </PMButton>
                </PMVStack>
              ) : (
                <PMVStack gap={2} alignItems="stretch">
                  {sortedReleases.map((version) => (
                    <PMBox key={version}>
                      <PMButton
                        variant="secondary"
                        size="sm"
                        width="100%"
                        onClick={() => setSelectedVersion(version)}
                        justifyContent="flex-start"
                        disabled={isLoading}
                      >
                        {version}
                      </PMButton>
                    </PMBox>
                  ))}
                </PMVStack>
              )}
            </PMDrawer.Body>

            <PMDrawer.CloseTrigger asChild>
              <PMCloseButton size="sm" disabled={isLoading} />
            </PMDrawer.CloseTrigger>
          </PMDrawer.Content>
        </PMDrawer.Positioner>
      </PMPortal>
    </PMDrawer.Root>
  );
}
