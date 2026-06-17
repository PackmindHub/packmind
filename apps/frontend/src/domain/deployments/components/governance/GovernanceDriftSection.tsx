import {
  PMAlert,
  PMBox,
  PMHeading,
  PMHStack,
  PMText,
  PMVStack,
} from '@packmind/ui';
import type { DriftedPackageInfo } from '@packmind/types';
import { GovernanceDriftRow } from './GovernanceDriftRow';

const CARD_INSET = 5;

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
      <PMHStack justify="space-between" align="baseline">
        <PMHeading
          level="h2"
          color="faded"
          fontSize="xs"
          fontWeight="medium"
          textTransform="uppercase"
          letterSpacing="0.08em"
        >
          Drift
        </PMHeading>
        {!isLoading && !isError && entries.length > 0 && (
          <PMText fontSize="sm" color="secondary">
            {buildDriftHeading(entries)}
          </PMText>
        )}
      </PMHStack>
      <PMBox
        bg="background.primary"
        borderRadius="md"
        paddingY={CARD_INSET}
        overflow="hidden"
      >
        {isError ? (
          <PMBox paddingX={CARD_INSET}>
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
          <PMVStack align="stretch" gap={0}>
            <SkeletonRows />
          </PMVStack>
        ) : entries.length === 0 ? (
          <PMBox
            paddingX={CARD_INSET}
            paddingY={3}
            minHeight="60px"
            display="flex"
            alignItems="center"
          >
            <PMText fontSize="sm" color="secondary">
              All distributions are up to date across your spaces.
            </PMText>
          </PMBox>
        ) : (
          <PMVStack align="stretch" gap={0}>
            {entries.map((entry, index) => (
              <GovernanceDriftRow
                key={`${entry.spaceId}:${entry.packageId}`}
                entry={entry}
                orgSlug={orgSlug}
                isLast={index === entries.length - 1}
              />
            ))}
          </PMVStack>
        )}
      </PMBox>
    </PMVStack>
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
          paddingX={CARD_INSET}
          paddingY={3}
          minHeight="60px"
          borderBottomWidth={i === 2 ? '0' : '1px'}
          borderColor="border.tertiary"
          display="flex"
          alignItems="center"
        >
          <PMHStack justify="space-between" align="center" width="full" gap={4}>
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
