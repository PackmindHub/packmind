import { PMText } from '@packmind/ui';
import {
  OrganizationId,
  RecipeId,
  SkillId,
  SpaceId,
  StandardId,
} from '@packmind/types';
import { usePackagesForArtifact } from '../../hooks/usePackagesForArtifact';
import { PackagesDropdown, formatPackageNames } from './PackagesDropdown';

interface PackageCountBadgeProps {
  artifactId: StandardId | RecipeId | SkillId | undefined;
  artifactType: 'standard' | 'recipe' | 'skill';
  orgSlug: string | undefined;
  spaceSlug: string | undefined;
  spaceId: SpaceId | undefined;
  organizationId: OrganizationId | undefined;
}

export const PackageCountBadge = ({
  artifactId,
  artifactType,
  orgSlug,
  spaceSlug,
  spaceId,
  organizationId,
}: PackageCountBadgeProps) => {
  const { packages, count, isLoading, isError } = usePackagesForArtifact({
    artifactId,
    artifactType,
    spaceId,
    organizationId,
  });

  if (isLoading || isError) return null;

  if (count === 0) {
    return <PMText data-testid="package-count-empty">{'\u2014'}</PMText>;
  }

  const displayText = formatPackageNames(packages);

  return (
    <PackagesDropdown
      packages={packages}
      orgSlug={orgSlug}
      spaceSlug={spaceSlug}
    >
      <PMText
        data-testid="package-count-names"
        fontSize="sm"
        cursor="pointer"
        _hover={{ textDecoration: 'underline' }}
      >
        {displayText}
      </PMText>
    </PackagesDropdown>
  );
};
