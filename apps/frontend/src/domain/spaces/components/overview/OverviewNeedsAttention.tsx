import { useNavigate } from 'react-router';
import { PMBox, PMHStack, PMText, PMVStack } from '@packmind/ui';
import type { PackageId } from '@packmind/types';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../hooks/useCurrentSpace';
import { routes } from '../../../../shared/utils/routes';
import { OverviewSectionLabel } from './OverviewSectionLabel';
import { useDriftedPackages } from './useDriftedPackages';

const MAX_HIGHLIGHTED_PACKAGES = 5;

function buildDriftHeading(
  driftedInstalls: number,
  driftedPackages: number,
): string {
  if (driftedInstalls === 1) {
    return '1 drifted distribution';
  }
  if (driftedPackages === 1) {
    return `${driftedInstalls} drifted distributions in 1 package`;
  }
  return `${driftedInstalls} drifted distributions across ${driftedPackages} packages`;
}

export const OverviewNeedsAttention = () => {
  const { organization } = useAuthContext();
  const { spaceSlug } = useCurrentSpace();
  const { driftedPackages, totalBehindInstalls, isReady } =
    useDriftedPackages();

  if (!isReady) return null;
  if (driftedPackages.length === 0) return null;

  const visible = driftedPackages.slice(0, MAX_HIGHLIGHTED_PACKAGES);
  const remaining = driftedPackages.length - visible.length;
  const heading = buildDriftHeading(
    totalBehindInstalls,
    driftedPackages.length,
  );

  return (
    <PMVStack align="stretch" gap={3} height="full">
      <OverviewSectionLabel>Needs attention</OverviewSectionLabel>
      <PMVStack
        align="stretch"
        gap={4}
        bg="background.primary"
        borderRadius="md"
        padding={5}
        height="full"
      >
        <PMText fontSize="md" fontWeight="medium" color="primary">
          {heading}
        </PMText>

        <PMBox
          borderTopWidth="1px"
          borderColor="border.tertiary"
          paddingTop={3}
        >
          <PMVStack align="stretch" gap={2}>
            {visible.map((pkg) => (
              <DriftedPackageRow
                key={pkg.id}
                packageId={pkg.id}
                packageName={pkg.name}
                behindInstalls={pkg.behindInstalls}
                href={
                  organization && spaceSlug
                    ? routes.space.toPackage(
                        organization.slug,
                        spaceSlug,
                        pkg.id,
                      )
                    : null
                }
              />
            ))}
            {remaining > 0 && (
              <PMText fontSize="sm" color="faded">
                +{remaining} more
              </PMText>
            )}
          </PMVStack>
        </PMBox>
      </PMVStack>
    </PMVStack>
  );
};

function DriftedPackageRow({
  packageId,
  packageName,
  behindInstalls,
  href,
}: Readonly<{
  packageId: PackageId;
  packageName: string;
  behindInstalls: number;
  href: string | null;
}>) {
  const navigate = useNavigate();
  const isInteractive = !!href;

  return (
    <PMHStack justify="space-between" align="baseline" gap={4}>
      <PMBox
        as={isInteractive ? 'button' : 'div'}
        onClick={isInteractive ? () => navigate(href) : undefined}
        role="group"
        bg="transparent"
        border="none"
        padding={0}
        cursor={isInteractive ? 'pointer' : 'default'}
        textAlign="left"
        minW={0}
        _focusVisible={{
          outline: '2px solid',
          outlineColor: 'border.brand',
          outlineOffset: '2px',
          borderRadius: 'sm',
        }}
        aria-label={isInteractive ? `Open package ${packageName}` : undefined}
        data-package-id={packageId}
      >
        <PMText
          fontSize="sm"
          color="primary"
          fontWeight="medium"
          truncate
          textDecoration={isInteractive ? 'underline' : 'none'}
          textDecorationColor="{colors.border.tertiary}"
          textUnderlineOffset="3px"
          transition="text-decoration-color 120ms ease-out"
          _groupHover={
            isInteractive
              ? { textDecorationColor: '{colors.text.primary}' }
              : undefined
          }
        >
          {packageName}
        </PMText>
      </PMBox>
      <PMText
        fontSize="sm"
        color="secondary"
        fontVariantNumeric="tabular-nums"
        flexShrink={0}
      >
        {behindInstalls}{' '}
        {behindInstalls === 1 ? 'distribution behind' : 'distributions behind'}
      </PMText>
    </PMHStack>
  );
}
