import { Link } from 'react-router';
import { PMPopover, PMVStack, PMText } from '@packmind/ui';
import {
  OrganizationId,
  RecipeId,
  SkillId,
  SpaceId,
  StandardId,
} from '@packmind/types';
import { usePackagesForArtifact } from '../../hooks/usePackagesForArtifact';
import { routes } from '../../../../shared/utils/routes';

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
  const { packages, count, isLoading } = usePackagesForArtifact({
    artifactId,
    artifactType,
    spaceId,
    organizationId,
  });

  if (isLoading) return null;

  if (count === 0) {
    return (
      <PMText variant="small" color="secondary">
        Not included in any package
      </PMText>
    );
  }

  return (
    <PMPopover.Root positioning={{ placement: 'bottom' }}>
      <PMPopover.Trigger asChild>
        <PMText
          variant="small"
          color="secondary"
          cursor="pointer"
          _hover={{ textDecoration: 'underline' }}
          data-testid="package-count-header-info"
        >
          Included in {count} package{count > 1 ? 's' : ''}
        </PMText>
      </PMPopover.Trigger>
      <PMPopover.Positioner>
        <PMPopover.Content width="auto" minWidth="180px" maxWidth="300px">
          <PMPopover.Arrow>
            <PMPopover.ArrowTip />
          </PMPopover.Arrow>
          <PMPopover.Body p={3}>
            <PMVStack gap={1} align="stretch">
              {packages.map((pkg) => (
                <Link
                  key={pkg.id}
                  target="_blank"
                  to={
                    orgSlug && spaceSlug
                      ? routes.space.toPackage(orgSlug, spaceSlug, pkg.id)
                      : '#'
                  }
                  style={{ textDecoration: 'none' }}
                >
                  <PMText
                    fontSize="sm"
                    _hover={{ textDecoration: 'underline' }}
                  >
                    {pkg.name}
                  </PMText>
                </Link>
              ))}
            </PMVStack>
          </PMPopover.Body>
        </PMPopover.Content>
      </PMPopover.Positioner>
    </PMPopover.Root>
  );
};
