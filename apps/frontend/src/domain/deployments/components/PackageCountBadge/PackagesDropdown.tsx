import { Link } from 'react-router';
import { LuChevronRight } from 'react-icons/lu';
import { PMMenu, PMHStack, PMPortal, PMText, PMVStack } from '@packmind/ui';
import { Package } from '@packmind/types';
import { routes } from '../../../../shared/utils/routes';

export function formatPackageNames(
  packages: Package[],
  maxLength = 60,
): string {
  if (packages.length === 0) return '';

  const sorted = [...packages].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );

  const names: string[] = [];
  let currentLength = 0;

  for (let i = 0; i < sorted.length; i++) {
    const name = sorted[i].name;
    const separator = names.length > 0 ? ', ' : '';
    const remaining = sorted.length - names.length - 1;
    const suffix = remaining > 0 ? ` and ${remaining} more` : '';
    const wouldBe = currentLength + separator.length + name.length;

    if (names.length === 0) {
      names.push(name);
      currentLength = name.length;
    } else if (wouldBe + suffix.length <= maxLength) {
      names.push(name);
      currentLength = wouldBe;
    } else {
      break;
    }
  }

  const remaining = sorted.length - names.length;
  if (remaining > 0) {
    return `${names.join(', ')} and ${remaining} more`;
  }
  return names.join(', ');
}

interface PackagesDropdownProps {
  packages: Package[];
  orgSlug: string | undefined;
  spaceSlug: string | undefined;
  children: React.ReactNode;
}

export const PackagesDropdown = ({
  packages,
  orgSlug,
  spaceSlug,
  children,
}: PackagesDropdownProps) => {
  const sorted = [...packages].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );

  return (
    <PMMenu.Root>
      <PMMenu.Trigger asChild>{children}</PMMenu.Trigger>
      <PMPortal>
        <PMMenu.Positioner>
          <PMMenu.Content minW="350px">
            {sorted.map((pkg) => (
              <PMMenu.Item
                key={pkg.id}
                value={pkg.id}
                asChild
                p={3}
                cursor="pointer"
              >
                <Link
                  target="_blank"
                  to={
                    orgSlug && spaceSlug
                      ? routes.space.toPackage(orgSlug, spaceSlug, pkg.id)
                      : '#'
                  }
                  style={{ textDecoration: 'none' }}
                >
                  <PMHStack justifyContent="space-between" width="100%">
                    <PMVStack alignItems="flex-start" gap={0}>
                      <PMText fontWeight="semibold" fontSize="sm">
                        {pkg.name}
                      </PMText>
                      {pkg.description && (
                        <PMText fontSize="xs" color="secondary">
                          {pkg.description.length > 100
                            ? `${pkg.description.slice(0, 100)}...`
                            : pkg.description}
                        </PMText>
                      )}
                    </PMVStack>
                    <LuChevronRight />
                  </PMHStack>
                </Link>
              </PMMenu.Item>
            ))}
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
};
