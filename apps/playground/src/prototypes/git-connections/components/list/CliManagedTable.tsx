import { PMAlert, PMBox, PMHStack, PMText, PMVStack } from '@packmind/ui';
import type { CliManagedEntry } from '../../types';
import { VendorMark } from '../shared/VendorMark';
import { formatAbsoluteDate } from '../shared/formatters';

type CliManagedTableProps = {
  entries: CliManagedEntry[];
};

export function CliManagedTable({ entries }: Readonly<CliManagedTableProps>) {
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

      {entries.length === 0 ? (
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
      ) : (
        <PMBox
          borderWidth="1px"
          borderColor="border.tertiary"
          borderRadius="md"
          overflow="hidden"
          bg="background.primary"
        >
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
            <PMBox width="200px">Created by</PMBox>
            <PMBox width="120px">Created</PMBox>
          </PMHStack>
          {entries.map((entry, idx) => (
            <PMHStack
              key={entry.id}
              gap={3}
              paddingX={4}
              paddingY={3}
              borderBottom={
                idx === entries.length - 1 ? undefined : '1px solid'
              }
              borderColor="border.tertiary"
            >
              <PMBox width="160px">
                <VendorMark vendor={entry.vendor} />
              </PMBox>
              <PMBox flex={1} minW={0}>
                <PMText
                  as="div"
                  fontSize="sm"
                  color="primary"
                  fontWeight="medium"
                >
                  {entry.repoPath}
                </PMText>
                <PMText as="div" fontSize="xs" color="faded">
                  {entry.instance}
                </PMText>
              </PMBox>
              <PMBox width="200px">
                <PMText as="div" fontSize="sm" color="secondary">
                  {entry.createdBy}
                </PMText>
                <PMText as="div" fontSize="xs" color="faded">
                  {entry.createdByEmailMasked}
                </PMText>
              </PMBox>
              <PMText
                width="120px"
                fontSize="xs"
                color="faded"
                fontVariantNumeric="tabular-nums"
              >
                {formatAbsoluteDate(entry.createdAt)}
              </PMText>
            </PMHStack>
          ))}
        </PMBox>
      )}
    </PMBox>
  );
}
