import { PMAlert, PMBox, PMHStack, PMText, PMVStack } from '@packmind/ui';
import type { DriftedPackageInfo } from '@packmind/types';
import { GovernanceDriftRow } from './GovernanceDriftRow';

interface GovernanceDriftSectionProps {
  entries: DriftedPackageInfo[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  orgSlug: string;
}

export function GovernanceDriftSection({
  entries,
  isLoading,
  isError,
  onRetry,
  orgSlug,
}: Readonly<GovernanceDriftSectionProps>) {
  return (
    <PMVStack align="stretch" gap={3}>
      <SectionHeader
        entries={entries}
        isLoading={isLoading}
        isError={isError}
      />
      <PMVStack
        align="stretch"
        gap={0}
        bg="background.primary"
        borderRadius="md"
        overflow="hidden"
      >
        {isError ? (
          <PMBox padding={5}>
            <PMAlert.Root status="error">
              <PMAlert.Indicator />
              <PMAlert.Content>
                <PMAlert.Title>Couldn't load drifted packages.</PMAlert.Title>
                <PMAlert.Description>
                  <PMBox
                    as="button"
                    onClick={onRetry}
                    bg="transparent"
                    border="none"
                    padding={0}
                    cursor="pointer"
                    color="text.primary"
                    fontSize="sm"
                    fontWeight="medium"
                    textDecoration="underline"
                    _focusVisible={{
                      outline: '2px solid',
                      outlineColor: 'border.brand',
                      outlineOffset: '2px',
                      borderRadius: 'sm',
                    }}
                  >
                    Retry
                  </PMBox>
                </PMAlert.Description>
              </PMAlert.Content>
            </PMAlert.Root>
          </PMBox>
        ) : isLoading ? (
          <SkeletonRows />
        ) : entries.length === 0 ? (
          <PMBox paddingX={4} paddingY={6}>
            <PMText fontSize="sm" color="secondary">
              All distributions are up to date across your spaces.
            </PMText>
          </PMBox>
        ) : (
          entries.map((entry) => (
            <GovernanceDriftRow
              key={`${entry.spaceId}:${entry.packageId}`}
              entry={entry}
              orgSlug={orgSlug}
            />
          ))
        )}
      </PMVStack>
    </PMVStack>
  );
}

function SectionHeader({
  entries,
  isLoading,
  isError,
}: Readonly<
  Pick<GovernanceDriftSectionProps, 'entries' | 'isLoading' | 'isError'>
>) {
  return (
    <PMHStack justify="space-between" align="baseline" paddingX={1}>
      <PMText fontSize="lg" fontWeight="medium" color="primary">
        Drift
      </PMText>
      {!isLoading && !isError && entries.length > 0 && (
        <PMText fontSize="sm" color="secondary">
          {buildDriftHeading(entries)}
        </PMText>
      )}
    </PMHStack>
  );
}

function buildDriftHeading(entries: DriftedPackageInfo[]): string {
  const totalBehind = entries.reduce(
    (sum, e) => sum + e.behindDistributions,
    0,
  );
  const packageCount = entries.length;
  if (totalBehind === 1) {
    return '1 distribution behind';
  }
  if (packageCount === 1) {
    return `${totalBehind} distributions behind in 1 package`;
  }
  return `${totalBehind} distributions behind across ${packageCount} packages`;
}

function SkeletonRows() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <PMBox
          key={i}
          paddingX={4}
          paddingY={3}
          borderTopWidth={i === 0 ? '0' : '1px'}
          borderColor="border.tertiary"
        >
          <PMHStack justify="space-between" align="baseline" gap={4}>
            <PMBox
              height="14px"
              width={`${40 + i * 10}%`}
              bg="background.secondary"
              borderRadius="sm"
            />
            <PMBox
              height="14px"
              width="80px"
              bg="background.secondary"
              borderRadius="sm"
            />
          </PMHStack>
        </PMBox>
      ))}
    </>
  );
}
