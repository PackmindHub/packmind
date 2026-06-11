import { useMemo, useState } from 'react';
import {
  PMAlert,
  PMBox,
  PMHStack,
  PMIcon,
  PMPage,
  PMSpinner,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuChevronRight } from 'react-icons/lu';
import { useNavigate } from 'react-router';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useListActiveDistributedPackagesBySpaceQuery } from '../../api/queries/DeploymentsQueries';
import {
  buildPackageDriftOverview,
  packageHasDrift,
  sortPackagesByDriftFirst,
  totalBehindInstallCount,
} from './selectors/buildPackageDriftOverview';
import type { PackageDrift } from './types';

export function DeploymentsOverviewRedesign() {
  const { organization } = useAuthContext();
  const { spaceId, spaceSlug, isReady } = useCurrentSpace();
  const { data, isLoading, isError } =
    useListActiveDistributedPackagesBySpaceQuery(spaceId);

  const packages = useMemo<PackageDrift[]>(
    () =>
      data ? sortPackagesByDriftFirst(buildPackageDriftOverview(data)) : [],
    [data],
  );

  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    null,
  );
  const selectedPackage = useMemo(
    () => packages.find((p) => p.id === selectedPackageId) ?? packages[0],
    [packages, selectedPackageId],
  );

  const driftPackagesCount = packages.filter(packageHasDrift).length;
  const driftedInstalls = totalBehindInstallCount(packages);
  const hasAnyDrift = driftPackagesCount > 0;
  const deploymentsHref =
    organization && spaceSlug
      ? `/org/${organization.slug}/space/${spaceSlug}/deployments`
      : null;

  return (
    <PMPage
      title="Overview"
      subtitle="Resolve drift between Packmind packages and their distributions."
      isFullWidth
      breadcrumbComponent={
        deploymentsHref ? <Backlink href={deploymentsHref} /> : undefined
      }
    >
      {!isReady || isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState />
      ) : packages.length === 0 ? (
        <EmptyState />
      ) : (
        <PMVStack gap={5} align="stretch">
          {hasAnyDrift ? (
            <PMHStack gap={10} align="baseline" wrap="wrap" paddingX={1}>
              <DriftKpi
                value={driftedInstalls}
                label={`drifted distribution${driftedInstalls === 1 ? '' : 's'}`}
                tone="warn"
              />
              <DriftKpi
                value={driftPackagesCount}
                label={`of ${packages.length} package${packages.length === 1 ? '' : 's'} affected`}
              />
            </PMHStack>
          ) : (
            <PMAlert.Root status="success">
              <PMAlert.Indicator />
              <PMAlert.Title>
                Every distribution is on the latest version of every artifact.
              </PMAlert.Title>
            </PMAlert.Root>
          )}
          <PMBox
            bg="background.primary"
            borderWidth="1px"
            borderColor="border.tertiary"
            borderRadius="md"
            overflow="hidden"
            height="calc(100vh - 280px)"
            minHeight="480px"
          >
            <PMHStack gap={0} align="stretch" height="100%">
              <PMBox
                width="320px"
                borderRightWidth="1px"
                borderColor="border.tertiary"
                overflowY="auto"
                padding={4}
              >
                <PMVStack gap={2} align="stretch">
                  {packages.map((pkg) => (
                    <PMBox
                      as="button"
                      key={pkg.id}
                      onClick={() => setSelectedPackageId(pkg.id)}
                      textAlign="left"
                      padding={2}
                      borderRadius="sm"
                      bg={
                        selectedPackage?.id === pkg.id
                          ? 'background.secondary'
                          : 'transparent'
                      }
                      _hover={{ bg: 'background.secondary' }}
                      cursor="pointer"
                    >
                      <PMText fontSize="sm" fontWeight="medium">
                        {pkg.name}
                      </PMText>
                      <PMText fontSize="xs" color="faded">
                        {packageHasDrift(pkg) ? 'Drift' : 'Aligned'}
                      </PMText>
                    </PMBox>
                  ))}
                </PMVStack>
              </PMBox>
              <PMBox
                flex="1"
                minW={0}
                minH={0}
                bg="background.primary"
                overflowY="auto"
                padding={6}
              >
                {selectedPackage ? (
                  <PMVStack gap={2} align="start">
                    <PMText fontSize="md" fontWeight="semibold">
                      {selectedPackage.name}
                    </PMText>
                    <PMText fontSize="sm" color="secondary">
                      {selectedPackage.description}
                    </PMText>
                    <PMText fontSize="xs" color="faded">
                      {selectedPackage.artifacts.length} artifact
                      {selectedPackage.artifacts.length === 1 ? '' : 's'} ·{' '}
                      {selectedPackage.installLocations.length} install
                      {selectedPackage.installLocations.length === 1 ? '' : 's'}
                    </PMText>
                  </PMVStack>
                ) : (
                  <PMText fontSize="sm" color="secondary">
                    Select a package from the list.
                  </PMText>
                )}
              </PMBox>
            </PMHStack>
          </PMBox>
        </PMVStack>
      )}
    </PMPage>
  );
}

function DriftKpi({
  value,
  label,
  tone = 'neutral',
}: Readonly<{
  value: number;
  label: string;
  tone?: 'neutral' | 'warn';
}>) {
  return (
    <PMHStack gap={2} align="baseline">
      <PMText
        fontSize="2xl"
        fontWeight="semibold"
        color={tone === 'warn' ? 'warning' : 'primary'}
        fontVariantNumeric="tabular-nums"
        lineHeight="1"
        letterSpacing="-0.02em"
      >
        {value}
      </PMText>
      <PMText fontSize="sm" color="secondary">
        {label}
      </PMText>
    </PMHStack>
  );
}

function Backlink({ href }: Readonly<{ href: string }>) {
  const navigate = useNavigate();
  return (
    <PMBox
      as="button"
      onClick={() => navigate(href)}
      display="inline-flex"
      alignItems="center"
      gap="6px"
      bg="transparent"
      border="none"
      padding={0}
      cursor="pointer"
      fontSize="sm"
      color="text.faded"
      transition="color 150ms ease-out"
      _hover={{ color: 'text.primary' }}
      aria-label="Back to deployments"
    >
      <PMIcon fontSize="sm">
        <LuChevronRight style={{ transform: 'rotate(180deg)' }} />
      </PMIcon>
      Deployments
    </PMBox>
  );
}

function LoadingState() {
  return (
    <PMHStack gap={3} padding={10} justify="center">
      <PMSpinner />
      <PMText fontSize="sm" color="secondary">
        Loading deployments…
      </PMText>
    </PMHStack>
  );
}

function ErrorState() {
  return (
    <PMAlert.Root status="error">
      <PMAlert.Indicator />
      <PMAlert.Title>
        Unable to load deployment drift data for this space.
      </PMAlert.Title>
    </PMAlert.Root>
  );
}

function EmptyState() {
  return (
    <PMAlert.Root status="info">
      <PMAlert.Indicator />
      <PMAlert.Title>
        No packages are distributed in this space yet.
      </PMAlert.Title>
    </PMAlert.Root>
  );
}
