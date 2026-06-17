import { Fragment } from 'react';
import {
  PMAlert,
  PMBox,
  PMHeading,
  PMHStack,
  PMText,
  PMVStack,
} from '@packmind/ui';
import type { DriftedPackageInfo, SpaceId } from '@packmind/types';
import { GovernanceDriftRow } from './GovernanceDriftRow';
import { GovernanceSpaceSectionHeader } from './GovernanceSpaceSectionHeader';

const CARD_INSET = 5;

interface GovernanceDriftSectionProps {
  entries: DriftedPackageInfo[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  orgSlug: string;
}

type SpaceGroup = {
  spaceId: SpaceId;
  spaceName: string;
  totalBehind: number;
  entries: DriftedPackageInfo[];
};

export function GovernanceDriftSection({
  entries,
  isLoading,
  isError,
  onRetry,
  orgSlug,
}: Readonly<GovernanceDriftSectionProps>) {
  const groups = groupBySpace(entries);

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
        borderWidth="1px"
        borderColor="border.tertiary"
        paddingY={isError || isLoading || entries.length === 0 ? CARD_INSET : 0}
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
            {groups.map((group) => (
              <Fragment key={group.spaceId}>
                <GovernanceSpaceSectionHeader
                  spaceName={group.spaceName}
                  behindCount={group.totalBehind}
                  packageCount={group.entries.length}
                />
                {group.entries.map((entry, index) => (
                  <GovernanceDriftRow
                    key={`${entry.spaceId}:${entry.packageId}`}
                    entry={entry}
                    orgSlug={orgSlug}
                    isLast={index === group.entries.length - 1}
                  />
                ))}
              </Fragment>
            ))}
          </PMVStack>
        )}
      </PMBox>
    </PMVStack>
  );
}

function groupBySpace(entries: DriftedPackageInfo[]): SpaceGroup[] {
  const map = new Map<SpaceId, SpaceGroup>();
  for (const entry of entries) {
    let group = map.get(entry.spaceId);
    if (!group) {
      group = {
        spaceId: entry.spaceId,
        spaceName: entry.spaceName,
        totalBehind: 0,
        entries: [],
      };
      map.set(entry.spaceId, group);
    }
    group.totalBehind += entry.behindDistributions;
    group.entries.push(entry);
  }
  return Array.from(map.values()).sort(
    (a, b) =>
      b.totalBehind - a.totalBehind || a.spaceName.localeCompare(b.spaceName),
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
