import { useNavigate } from 'react-router';
import {
  PMBox,
  PMHStack,
  PMIcon,
  PMSkeleton,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuChevronRight } from 'react-icons/lu';
import {
  useGetDashboardKpiQuery,
  useListPackagesBySpaceQuery,
} from '../../../deployments/api/queries/DeploymentsQueries';
import { useCurrentSpace } from '../../hooks/useCurrentSpace';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { routes } from '../../../../shared/utils/routes';
import { OverviewSectionLabel } from './OverviewSectionLabel';

const CARD_INSET = 5;
const ROW_LABEL_WIDTH = '96px';
const TOTAL_MIN_WIDTH = '40px';

type SnapshotRowData = {
  key: 'standards' | 'skills' | 'commands' | 'packages';
  label: string;
  total: number;
  active?: number;
  href: string | null;
};

export const OverviewSnapshot = () => {
  const { organization } = useAuthContext();
  const { spaceSlug, spaceId, isReady } = useCurrentSpace();
  const { data: kpi, isLoading: isKpiLoading } = useGetDashboardKpiQuery(
    spaceId ?? '',
  );
  const { data: packagesResponse, isLoading: isPackagesLoading } =
    useListPackagesBySpaceQuery(spaceId, organization?.id);

  const showSkeleton = isKpiLoading || isPackagesLoading || !isReady;

  const rows: SnapshotRowData[] = [
    {
      key: 'standards',
      label: 'Standards',
      total: kpi?.standards.total ?? 0,
      active: kpi?.standards.active ?? 0,
      href:
        organization && spaceSlug
          ? routes.space.toStandards(organization.slug, spaceSlug)
          : null,
    },
    {
      key: 'skills',
      label: 'Skills',
      total: kpi?.skills.total ?? 0,
      active: kpi?.skills.active ?? 0,
      href:
        organization && spaceSlug
          ? routes.space.toSkills(organization.slug, spaceSlug)
          : null,
    },
    {
      key: 'commands',
      label: 'Commands',
      total: kpi?.recipes.total ?? 0,
      active: kpi?.recipes.active ?? 0,
      href:
        organization && spaceSlug
          ? routes.space.toCommands(organization.slug, spaceSlug)
          : null,
    },
    {
      key: 'packages',
      label: 'Packages',
      total: packagesResponse?.packages?.length ?? 0,
      href:
        organization && spaceSlug
          ? routes.space.toPackages(organization.slug, spaceSlug)
          : null,
    },
  ];

  return (
    <PMVStack align="stretch" gap={3} height="full">
      <OverviewSectionLabel>Playbook</OverviewSectionLabel>
      <PMBox
        bg="background.primary"
        borderRadius="md"
        paddingY={CARD_INSET}
        height="full"
        overflow="hidden"
      >
        <PMVStack align="stretch" gap={0}>
          {rows.map((row, index) => (
            <SnapshotRow
              key={row.key}
              row={row}
              showSkeleton={showSkeleton}
              isLast={index === rows.length - 1}
            />
          ))}
        </PMVStack>
      </PMBox>
    </PMVStack>
  );
};

function SnapshotRow({
  row,
  showSkeleton,
  isLast,
}: Readonly<{
  row: SnapshotRowData;
  showSkeleton: boolean;
  isLast: boolean;
}>) {
  const navigate = useNavigate();
  const isInteractive = !!row.href;

  const handleClick = () => {
    if (row.href) navigate(row.href);
  };

  return (
    <PMBox
      as={isInteractive ? 'button' : 'div'}
      onClick={isInteractive ? handleClick : undefined}
      aria-label={
        isInteractive ? `Go to ${row.label.toLowerCase()}` : undefined
      }
      role="group"
      width="full"
      bg="transparent"
      border="none"
      borderBottomWidth={isLast ? '0' : '1px'}
      borderColor="border.tertiary"
      paddingX={CARD_INSET}
      paddingY={3}
      minHeight="60px"
      cursor={isInteractive ? 'pointer' : 'default'}
      transition="background-color 120ms ease-out"
      textAlign="left"
      _hover={isInteractive ? { bg: 'background.tertiary' } : undefined}
      _focusVisible={{
        outline: '2px solid',
        outlineColor: 'border.brand',
        outlineOffset: '-2px',
      }}
    >
      <PMHStack gap={4} align="center" justify="space-between" height="full">
        <PMHStack gap={5} align="baseline" minW={0} flex={1}>
          <PMText
            fontSize="md"
            fontWeight="medium"
            color="primary"
            width={ROW_LABEL_WIDTH}
            flexShrink={0}
          >
            {row.label}
          </PMText>
          {showSkeleton ? (
            <SnapshotRowSkeleton hasBreakdown={row.active !== undefined} />
          ) : (
            <SnapshotRowValue row={row} />
          )}
        </PMHStack>
        {isInteractive && (
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
        )}
      </PMHStack>
    </PMBox>
  );
}

function SnapshotRowSkeleton({
  hasBreakdown,
}: Readonly<{ hasBreakdown: boolean }>) {
  return (
    <PMHStack gap={4} align="baseline">
      <PMSkeleton height="28px" width="36px" borderRadius="sm" />
      {hasBreakdown && (
        <>
          <PMSkeleton height="14px" width="60px" borderRadius="sm" />
          <PMSkeleton height="14px" width="80px" borderRadius="sm" />
        </>
      )}
    </PMHStack>
  );
}

function SnapshotRowValue({ row }: Readonly<{ row: SnapshotRowData }>) {
  if (row.total === 0) {
    return (
      <PMText fontSize="sm" color="faded">
        No {row.label.toLowerCase()} yet
      </PMText>
    );
  }

  const hasBreakdown = row.active !== undefined;
  const nonLive = hasBreakdown ? row.total - (row.active ?? 0) : 0;

  return (
    <PMHStack gap={4} align="baseline" wrap="wrap">
      <PMText
        fontSize="2xl"
        fontWeight="semibold"
        color="primary"
        fontVariantNumeric="tabular-nums"
        lineHeight="1"
        minW={TOTAL_MIN_WIDTH}
      >
        {row.total}
      </PMText>
      {hasBreakdown && (
        <>
          <PMText
            fontSize="sm"
            color="secondary"
            fontVariantNumeric="tabular-nums"
          >
            <PMText as="span" color="primary" fontWeight="medium">
              {row.active}
            </PMText>{' '}
            live
          </PMText>
          {nonLive > 0 && (
            <PMText
              fontSize="sm"
              color="secondary"
              fontVariantNumeric="tabular-nums"
            >
              <PMText as="span" color="primary" fontWeight="medium">
                {nonLive}
              </PMText>{' '}
              non-live
            </PMText>
          )}
        </>
      )}
    </PMHStack>
  );
}
