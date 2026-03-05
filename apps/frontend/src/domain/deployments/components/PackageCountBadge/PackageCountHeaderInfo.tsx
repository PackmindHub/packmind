import { PMHStack, PMLink, PMText } from '@packmind/ui';
import {
  OrganizationId,
  RecipeId,
  SkillId,
  SpaceId,
  StandardId,
} from '@packmind/types';
import { usePackagesForArtifact } from '../../hooks/usePackagesForArtifact';
import { PackagesDropdown } from './PackagesDropdown';

interface PackageCountHeaderInfoProps {
  artifactId: StandardId | RecipeId | SkillId | undefined;
  artifactType: 'standard' | 'recipe' | 'skill';
  orgSlug: string | undefined;
  spaceSlug: string | undefined;
  spaceId: SpaceId | undefined;
  organizationId: OrganizationId | undefined;
}

export const PackageCountHeaderInfo = ({
  artifactId,
  artifactType,
  orgSlug,
  spaceSlug,
  spaceId,
  organizationId,
}: PackageCountHeaderInfoProps) => {
  const { packages, count, isLoading, isError } = usePackagesForArtifact({
    artifactId,
    artifactType,
    spaceId,
    organizationId,
  });

  if (isLoading || isError) return null;

  if (count === 0) {
    return (
      <PMText variant="small" color="secondary">
        Not included in any package
      </PMText>
    );
  }

  return (
    <PackagesDropdown
      packages={packages}
      orgSlug={orgSlug}
      spaceSlug={spaceSlug}
    >
      <PMHStack
        gap={1}
        alignItems="center"
        data-testid="package-count-header-info"
      >
        <PMText variant="small" color="secondary">
          Package:
        </PMText>
        <PMText variant="small">in {count}</PMText>
        <PMLink fontSize="xs" variant="underline">
          View all
        </PMLink>
      </PMHStack>
    </PackagesDropdown>
  );
};
