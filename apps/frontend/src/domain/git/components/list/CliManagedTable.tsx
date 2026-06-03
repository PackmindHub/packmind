import React from 'react';
import { PMAlert, PMBox, PMHStack, PMText, PMVStack } from '@packmind/ui';
import { GitProviderUI } from '../../types/GitProviderTypes';
import { VendorMark } from '../shared/VendorMark';

interface CliManagedTableProps {
  entries: GitProviderUI[];
}

export const CliManagedTable: React.FC<CliManagedTableProps> = ({
  entries,
}) => (
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

    {entries.length === 0 ? (
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
        {entries.map((entry, idx) => (
          <CliRow
            key={entry.id}
            entry={entry}
            isLast={idx === entries.length - 1}
          />
        ))}
      </PMBox>
    )}
  </PMBox>
);

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
  entry: GitProviderUI;
  isLast: boolean;
}

const CliRow: React.FC<CliRowProps> = ({ entry, isLast }) => {
  const firstRepo = entry.repos?.[0];
  const repoPath = firstRepo
    ? `${firstRepo.owner}/${firstRepo.repo}`
    : (entry.url ?? '—');
  const additional = (entry.repos?.length ?? 0) - 1;

  return (
    <PMHStack
      gap={3}
      paddingX={4}
      paddingY={3}
      borderBottom={isLast ? undefined : '1px solid'}
      borderColor="border.tertiary"
      align="center"
    >
      <PMBox width="160px">
        <VendorMark vendor={entry.source} />
      </PMBox>
      <PMBox flex={1} minW={0}>
        <PMText as="div" fontSize="sm" color="primary" fontWeight="medium">
          {repoPath}
          {additional > 0 && (
            <PMText
              as="span"
              fontSize="xs"
              color="faded"
              fontWeight="normal"
              marginLeft={2}
            >
              +{additional} more
            </PMText>
          )}
        </PMText>
        {entry.url && (
          <PMText as="div" fontSize="xs" color="faded">
            {entry.url}
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
