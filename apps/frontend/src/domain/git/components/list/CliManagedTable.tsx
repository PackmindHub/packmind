import React, { useCallback, useMemo, useState } from 'react';
import {
  PMAlert,
  PMBox,
  PMHStack,
  PMIcon,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuChevronRight } from 'react-icons/lu';
import { GitProviderUI } from '../../types/GitProviderTypes';
import { VendorMark, vendorLabel } from '../shared/VendorMark';

interface CliManagedTableProps {
  entries: GitProviderUI[];
}

export const CliManagedTable: React.FC<CliManagedTableProps> = ({
  entries,
}) => {
  const providers = useMemo(
    () =>
      entries.map((provider) => ({
        provider,
        repoCount: new Set(
          (provider.repos ?? []).map((r) => `${r.owner}/${r.repo}`),
        ).size,
      })),
    [entries],
  );

  return (
    <PMBox>
      <PMAlert.Root status="info" marginBottom={3}>
        <PMAlert.Indicator />
        <PMVStack gap={1} align="stretch" flex={1}>
          <PMAlert.Title>
            <PMText as="span" fontSize="sm" color="primary" fontWeight="medium">
              Created automatically by{' '}
              <PMBox
                as="code"
                display="inline"
                fontSize="xs"
                fontFamily="mono"
                paddingX={1}
                paddingY={0.5}
                borderRadius="sm"
                bg="background.tertiary"
                color="text.primary"
              >
                packmind-cli
              </PMBox>
            </PMText>
          </PMAlert.Title>
          <PMText as="div" fontSize="xs" color="secondary">
            These entries are recorded when a developer pulls Packmind context
            into a repo from their machine. They are read-only here. To remove
            one, ask the developer to revoke it from their local CLI session.
          </PMText>
        </PMVStack>
      </PMAlert.Root>

      {providers.length === 0 ? (
        <EmptyState />
      ) : (
        <PMBox
          borderWidth="1px"
          borderColor="border.tertiary"
          borderRadius="md"
          overflow="hidden"
          bg="background.primary"
        >
          <TableHeader />
          {providers.map(({ provider, repoCount }, idx) => (
            <ProviderRow
              key={provider.id}
              provider={provider}
              repoCount={repoCount}
              isLast={idx === providers.length - 1}
            />
          ))}
        </PMBox>
      )}
    </PMBox>
  );
};

const TableHeader: React.FC = () => (
  <PMHStack
    gap={3}
    paddingX={4}
    paddingY={2.5}
    bg="background.secondary"
    borderBottom="1px solid"
    borderColor="border.tertiary"
    fontSize="10px"
    color="text.faded"
    textTransform="uppercase"
    letterSpacing="wider"
    fontWeight="semibold"
  >
    <PMBox flex={1.6} minW={0}>
      Connection
    </PMBox>
    <PMBox width="160px">Status</PMBox>
    <PMBox width="70px" textAlign="right">
      Repos
    </PMBox>
    <PMBox width="140px" />
    <PMBox width="90px" />
  </PMHStack>
);

interface ProviderRowProps {
  provider: GitProviderUI;
  repoCount: number;
  isLast: boolean;
}

const ProviderRow: React.FC<ProviderRowProps> = ({
  provider,
  repoCount,
  isLast,
}) => {
  const [expanded, setExpanded] = useState(false);
  const repoPaths = useMemo(
    () =>
      Array.from(
        new Set((provider.repos ?? []).map((r) => `${r.owner}/${r.repo}`)),
      ).sort((a, b) => a.localeCompare(b)),
    [provider.repos],
  );
  const canExpand = repoPaths.length > 0;

  const toggle = useCallback(() => {
    if (canExpand) setExpanded((v) => !v);
  }, [canExpand]);

  const urlLabel = provider.url ?? vendorFallbackLabel(provider.source);

  return (
    <PMBox
      borderBottom={isLast ? undefined : '1px solid'}
      borderColor="border.tertiary"
    >
      <PMHStack
        role={canExpand ? 'button' : undefined}
        tabIndex={canExpand ? 0 : undefined}
        aria-expanded={canExpand ? expanded : undefined}
        onClick={toggle}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (!canExpand) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
        data-testid="cli-managed-row"
        data-vendor={provider.source}
        data-url={provider.url ?? ''}
        data-repo-count={repoCount}
        data-expanded={expanded ? 'true' : 'false'}
        gap={3}
        paddingX={4}
        paddingY={3}
        cursor={canExpand ? 'pointer' : 'default'}
        _hover={canExpand ? { bg: 'background.secondary' } : undefined}
        transition="background-color 120ms ease-out"
      >
        <PMHStack gap={2} flex={1.6} minW={0} align="center">
          <PMBox
            color={canExpand ? 'text.faded' : 'transparent'}
            display="flex"
            alignItems="center"
            transform={expanded ? 'rotate(90deg)' : 'rotate(0deg)'}
            transition="transform 150ms ease-out"
          >
            <PMIcon fontSize="sm">
              <LuChevronRight />
            </PMIcon>
          </PMBox>
          <VendorMark vendor={provider.source} size="md" showLabel={false} />
          <PMText
            as="p"
            fontSize="sm"
            color="primary"
            fontWeight="medium"
            truncate
          >
            {vendorLabel(provider.source)} · {urlLabel}
          </PMText>
        </PMHStack>

        <PMBox width="160px">
          <CliTag />
        </PMBox>

        <PMText
          width="70px"
          fontSize="sm"
          color="secondary"
          textAlign="right"
          fontVariantNumeric="tabular-nums"
        >
          {repoCount}
        </PMText>

        <PMBox width="140px" />
        <PMBox width="90px" />
      </PMHStack>

      {expanded && canExpand && (
        <PMVStack
          align="stretch"
          gap={0}
          bg="background.secondary"
          borderTop="1px solid"
          borderColor="border.tertiary"
        >
          {repoPaths.map((path) => (
            <PMHStack
              key={path}
              data-testid="cli-managed-repo-row"
              data-repo-path={path}
              gap={3}
              paddingY={2}
              paddingLeft="3.25rem"
              paddingRight={4}
            >
              <PMText fontSize="sm" color="secondary" truncate>
                {path}
              </PMText>
            </PMHStack>
          ))}
        </PMVStack>
      )}
    </PMBox>
  );
};

const CliTag: React.FC = () => (
  <PMBox
    as="span"
    display="inline-flex"
    alignItems="center"
    bg="background.tertiary"
    color="text.secondary"
    fontSize="xs"
    fontWeight="medium"
    letterSpacing="wider"
    textTransform="uppercase"
    paddingX={2}
    paddingY={0.5}
    borderRadius="sm"
  >
    CLI
  </PMBox>
);

const EmptyState: React.FC = () => (
  <PMBox
    borderWidth="1px"
    borderColor="border.tertiary"
    borderRadius="md"
    paddingX={5}
    paddingY={10}
    textAlign="center"
  >
    <PMText fontSize="sm" color="secondary">
      No CLI sessions yet.
    </PMText>
    <PMText fontSize="xs" color="faded" marginTop={1}>
      They appear here the first time someone runs{' '}
      <PMBox
        as="code"
        display="inline"
        fontSize="xs"
        fontFamily="mono"
        paddingX={1}
        paddingY={0.5}
        borderRadius="sm"
        bg="background.tertiary"
        color="text.faded"
      >
        packmind-cli pull
      </PMBox>{' '}
      against a repo.
    </PMText>
  </PMBox>
);

function vendorFallbackLabel(vendor: string): string {
  if (vendor === 'github') return 'github.com';
  if (vendor === 'gitlab') return 'gitlab.com';
  return vendor;
}
