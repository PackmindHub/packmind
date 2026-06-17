import { useNavigate } from 'react-router';
import { PMBox, PMHStack, PMIcon, PMText } from '@packmind/ui';
import type { DriftedPackageInfo } from '@packmind/types';
import { LuChevronRight } from 'react-icons/lu';
import { formatRelativeDate } from '../redesign/selectors/installDriftEntries';
import { routes } from '../../../../shared/utils/routes';

const CARD_INSET = 5;

interface GovernanceDriftRowProps {
  entry: DriftedPackageInfo;
  orgSlug: string;
  isLast: boolean;
}

export function GovernanceDriftRow({
  entry,
  orgSlug,
  isLast,
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
      onClick={() => navigate(href)}
      aria-label={`Open package ${entry.packageName} in space ${entry.spaceName}`}
      role="group"
      width="full"
      bg="transparent"
      border="none"
      borderBottomWidth={isLast ? '0' : '1px'}
      borderColor="border.tertiary"
      paddingX={CARD_INSET}
      paddingY={3}
      minHeight="60px"
      cursor="pointer"
      textAlign="left"
      transition="background-color 120ms ease-out"
      _hover={{ bg: 'background.tertiary' }}
      _focusVisible={{
        outline: '2px solid',
        outlineColor: 'border.brand',
        outlineOffset: '-2px',
      }}
    >
      <PMHStack gap={4} align="center" justify="space-between" height="full">
        <PMText
          fontSize="md"
          fontWeight="medium"
          color="primary"
          truncate
          minW={0}
          flex={1}
        >
          {entry.packageName}
        </PMText>
        <PMHStack gap={5} align="center" flexShrink={0}>
          <PMText
            fontSize="sm"
            fontWeight="medium"
            color="primary"
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
          <PMIcon
            color="text.faded"
            fontSize="md"
            transition="color 120ms ease-out, transform 120ms ease-out"
            _groupHover={{
              color: 'text.primary',
              transform: 'translateX(2px)',
            }}
          >
            <LuChevronRight />
          </PMIcon>
        </PMHStack>
      </PMHStack>
    </PMBox>
  );
}
