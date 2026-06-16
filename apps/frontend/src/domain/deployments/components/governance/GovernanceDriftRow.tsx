import { useNavigate } from 'react-router';
import { PMBox, PMHStack, PMText } from '@packmind/ui';
import type { DriftedPackageInfo } from '@packmind/types';
import { LuChevronRight } from 'react-icons/lu';
import { formatRelativeDate } from '../redesign/selectors/installDriftEntries';
import { routes } from '../../../../shared/utils/routes';

interface GovernanceDriftRowProps {
  entry: DriftedPackageInfo;
  orgSlug: string;
}

export function GovernanceDriftRow({
  entry,
  orgSlug,
}: Readonly<GovernanceDriftRowProps>) {
  const navigate = useNavigate();
  const href = routes.space.toPackage(
    orgSlug,
    entry.spaceSlug,
    entry.packageId,
  );

  return (
    <PMBox
      as="button"
      role="link"
      onClick={() => navigate(href)}
      aria-label={`Open package ${entry.packageName} in space ${entry.spaceName}`}
      width="full"
      bg="transparent"
      border="none"
      paddingX={4}
      paddingY={3}
      cursor="pointer"
      textAlign="left"
      _hover={{ backgroundColor: 'background.secondary' }}
      _focusVisible={{
        outline: '2px solid',
        outlineColor: 'border.brand',
        outlineOffset: '-2px',
        borderRadius: 'sm',
      }}
      transition="background-color 120ms ease-out"
    >
      <PMHStack justify="space-between" align="baseline" gap={4}>
        <PMHStack gap={3} minW={0} flex={1} align="baseline">
          <PMText
            fontSize="sm"
            fontWeight="medium"
            color="primary"
            truncate
            flexShrink={1}
          >
            {entry.packageName}
          </PMText>
          <PMText fontSize="xs" color="tertiary" truncate flexShrink={0}>
            {entry.spaceName}
          </PMText>
        </PMHStack>
        <PMHStack gap={5} align="baseline" flexShrink={0}>
          <PMText
            fontSize="sm"
            color="secondary"
            fontVariantNumeric="tabular-nums"
          >
            {entry.behindDistributions === 1
              ? '1 behind'
              : `${entry.behindDistributions} behind`}
          </PMText>
          <PMText fontSize="xs" color="faded">
            {entry.lastUpdatedAt
              ? formatRelativeDate(entry.lastUpdatedAt)
              : 'no recent distribution'}
          </PMText>
          <PMBox color="faded" display="inline-flex" alignItems="center">
            <LuChevronRight />
          </PMBox>
        </PMHStack>
      </PMHStack>
    </PMBox>
  );
}
