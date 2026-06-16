import { PMBox, PMHStack, PMText, PMVStack } from '@packmind/ui';
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
              <PMHStack
                key={pkg.id}
                justify="space-between"
                align="baseline"
                gap={4}
              >
                <PMText
                  fontSize="sm"
                  color="primary"
                  fontWeight="medium"
                  truncate
                >
                  {pkg.name}
                </PMText>
                <PMText
                  fontSize="sm"
                  color="secondary"
                  fontVariantNumeric="tabular-nums"
                  flexShrink={0}
                >
                  {pkg.behindInstalls}{' '}
                  {pkg.behindInstalls === 1
                    ? 'distribution behind'
                    : 'distributions behind'}
                </PMText>
              </PMHStack>
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
