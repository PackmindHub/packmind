import React, { useMemo } from 'react';
import { PMAlert, PMBox, PMHStack, PMText, PMVStack } from '@packmind/ui';
import { GitProviderUI, GitRepoUI } from '../../types/GitProviderTypes';
import { VendorMark } from '../shared/VendorMark';

interface CliManagedTableProps {
  entries: GitProviderUI[];
}

interface CliRepoRow {
  key: string;
  repo: GitRepoUI;
  provider: GitProviderUI;
}

export const CliManagedTable: React.FC<CliManagedTableProps> = ({
  entries,
}) => {
  const rows = useMemo<CliRepoRow[]>(
    () =>
      entries.flatMap((provider) =>
        (provider.repos ?? []).map((repo) => ({
          key: `${provider.id}:${repo.id}`,
          repo,
          provider,
        })),
      ),
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

      {rows.length === 0 ? (
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
          {rows.map((row, idx) => (
            <CliRow key={row.key} row={row} isLast={idx === rows.length - 1} />
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
    <PMBox width="160px">Vendor</PMBox>
    <PMBox flex={1} minW={0}>
      Repository
    </PMBox>
  </PMHStack>
);

interface CliRowProps {
  row: CliRepoRow;
  isLast: boolean;
}

const CliRow: React.FC<CliRowProps> = ({ row, isLast }) => {
  const { repo, provider } = row;
  const repoPath = `${repo.owner}/${repo.repo}`;

  return (
    <PMHStack
      data-testid="cli-managed-row"
      data-provider-id={provider.id}
      data-vendor={provider.source}
      data-url={provider.url ?? ''}
      data-repo-path={repoPath}
      gap={3}
      paddingX={4}
      paddingY={3}
      borderBottom={isLast ? undefined : '1px solid'}
      borderColor="border.tertiary"
      align="center"
    >
      <PMBox width="160px">
        <VendorMark vendor={provider.source} />
      </PMBox>
      <PMBox flex={1} minW={0}>
        <PMText as="div" fontSize="sm" color="primary" fontWeight="medium">
          {repoPath}
        </PMText>
        {provider.url && (
          <PMText as="div" fontSize="xs" color="faded">
            {provider.url}
          </PMText>
        )}
      </PMBox>
    </PMHStack>
  );
};

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
      No CLI-managed entries yet.
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
