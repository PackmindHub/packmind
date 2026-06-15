import { useMemo, useState } from 'react';
import {
  PMAlert,
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMPage,
  PMSpinner,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuChevronRight } from 'react-icons/lu';
import { useNavigate, useSearchParams } from 'react-router';
import type { GitProviderId, PackageId } from '@packmind/types';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useGetGitProvidersQuery } from '../../../git/api/queries/GitProviderQueries';
import { useListActiveDistributedPackagesBySpaceQuery } from '../../api/queries/DeploymentsQueries';
import { routes } from '../../../../shared/utils/routes';
import {
  buildPackageDriftOverview,
  packageHasDrift,
  sortPackagesByDriftFirst,
  totalBehindInstallCount,
  totalFailedInstallCount,
} from './selectors/buildPackageDriftOverview';
import {
  behindInstallsRequiringCliCount,
  providersWithTokenSet,
} from './selectors/providerAuth';
import { PackageMasterRail } from './components/PackageMasterRail';
import { PackageDetailPane } from './components/PackageDetailPane';
import { SyncSurface, type SyncScope } from './components/SyncSurface';
import { STUB_PACKAGES, STUB_PROVIDER_OK } from './stubPackages';
import type { PackageDrift } from './types';

export function DeploymentsOverviewRedesign() {
  const { organization } = useAuthContext();
  const { spaceId, spaceSlug, isReady } = useCurrentSpace();
  const [searchParams] = useSearchParams();
  const isStubMode = import.meta.env.DEV && searchParams.get('stub') === '1';
  const { data, isLoading, isError } =
    useListActiveDistributedPackagesBySpaceQuery(
      isStubMode ? undefined : spaceId,
    );
  const { data: providersResponse, isLoading: isProvidersLoading } =
    useGetGitProvidersQuery();

  const providersWithToken = useMemo<Set<GitProviderId>>(() => {
    if (isStubMode) return new Set([STUB_PROVIDER_OK]);
    return providersWithTokenSet(providersResponse);
  }, [providersResponse, isStubMode]);

  const packages = useMemo<PackageDrift[]>(() => {
    if (isStubMode) return sortPackagesByDriftFirst(STUB_PACKAGES);
    return data
      ? sortPackagesByDriftFirst(buildPackageDriftOverview(data))
      : [];
  }, [data, isStubMode]);

  const [selectedPackageId, setSelectedPackageId] = useState<PackageId | null>(
    null,
  );
  const [bulkSelected, setBulkSelected] = useState<Set<PackageId>>(
    () => new Set(),
  );
  const selectedPackage = useMemo(
    () => packages.find((p) => p.id === selectedPackageId) ?? packages[0],
    [packages, selectedPackageId],
  );

  const [syncScope, setSyncScope] = useState<SyncScope | null>(null);

  const handleToggleBulk = (packageId: PackageId) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(packageId)) next.delete(packageId);
      else next.add(packageId);
      return next;
    });
  };
  const handleDistributeBulk = () => {
    if (bulkSelected.size === 0) return;
    setSyncScope({ kind: 'bulk', packageIds: Array.from(bulkSelected) });
  };
  const handleSyncPackage = (packageId: PackageId, installKeys?: string[]) => {
    setSyncScope({ kind: 'package', packageId, installKeys });
  };
  const handleDistributeAllDrifted = () => {
    const driftedIds = packages.filter(packageHasDrift).map((p) => p.id);
    if (driftedIds.length === 0) return;
    setBulkSelected(new Set(driftedIds));
    setSyncScope({ kind: 'bulk', packageIds: driftedIds });
  };

  const driftPackagesCount = packages.filter(packageHasDrift).length;
  const driftedInstalls = totalBehindInstallCount(packages);
  const failedInstalls = totalFailedInstallCount(packages);
  const cliRequiredInstalls = useMemo(
    () => behindInstallsRequiringCliCount(packages, providersWithToken),
    [packages, providersWithToken],
  );
  const hasAnyDrift = driftPackagesCount > 0;
  const hasAnySignal = hasAnyDrift || failedInstalls > 0;
  const deploymentsHref =
    organization && spaceSlug
      ? `/org/${organization.slug}/space/${spaceSlug}/deployments`
      : null;
  const autoUpdateHref = organization
    ? routes.org.toSetupAutoUpdate(organization.slug)
    : null;
  const navigate = useNavigate();

  return (
    <PMPage
      title="Overview"
      subtitle="Resolve drift between Packmind packages and their distributions."
      isFullWidth
      breadcrumbComponent={
        deploymentsHref ? <Backlink href={deploymentsHref} /> : undefined
      }
    >
      {!isStubMode && (!isReady || isLoading) ? (
        <LoadingState />
      ) : !isStubMode && isError ? (
        <ErrorState />
      ) : !isStubMode && packages.length === 0 ? (
        <EmptyState />
      ) : syncScope !== null ? (
        <SyncSurface
          packages={packages}
          scope={syncScope}
          providersWithToken={providersWithToken}
          isProvidersLoading={isProvidersLoading && !isStubMode}
          onCancel={() => setSyncScope(null)}
          onConfirm={() => {
            if (syncScope?.kind === 'bulk') {
              setBulkSelected(new Set());
            }
          }}
        />
      ) : (
        <PMVStack gap={5} align="stretch">
          {isStubMode && (
            <PMAlert.Root status="warning">
              <PMAlert.Indicator />
              <PMAlert.Title>
                Stub mode — fictional data. Clicking Distribute will hit the
                real backend with non-existent IDs and fail.
              </PMAlert.Title>
            </PMAlert.Root>
          )}
          <PMHStack
            justify="space-between"
            align="center"
            wrap="wrap"
            rowGap={2}
            columnGap={4}
            paddingX={1}
            paddingY={1}
            borderBottomWidth="1px"
            borderColor="border.tertiary"
            paddingBottom={4}
          >
            <SummaryLine
              hasAnyDrift={hasAnyDrift}
              driftedInstalls={driftedInstalls}
              driftPackagesCount={driftPackagesCount}
              totalPackagesCount={packages.length}
              failedInstalls={failedInstalls}
              cliRequiredInstalls={cliRequiredInstalls}
            />
            {hasAnySignal && (
              <PMHStack gap={2} flexShrink={0}>
                {hasAnyDrift && (
                  <PMButton
                    variant="primary"
                    size="sm"
                    onClick={handleDistributeAllDrifted}
                  >
                    {`Distribute drifted (${driftPackagesCount})`}
                  </PMButton>
                )}
                {autoUpdateHref && (
                  <PMButton
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(autoUpdateHref)}
                  >
                    Set up Auto-update
                  </PMButton>
                )}
              </PMHStack>
            )}
          </PMHStack>
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
              <PackageMasterRail
                packages={packages}
                selectedPackageId={selectedPackage?.id ?? null}
                onSelect={setSelectedPackageId}
                bulkSelected={bulkSelected}
                onToggleBulk={handleToggleBulk}
                onSetBulkSelection={setBulkSelected}
                onDistributeBulk={handleDistributeBulk}
                providersWithToken={providersWithToken}
                isProvidersLoading={isProvidersLoading && !isStubMode}
              />
              <PMBox
                flex="1"
                minW={0}
                minH={0}
                bg="background.primary"
                overflowY="auto"
              >
                {selectedPackage ? (
                  <PackageDetailPane
                    key={selectedPackage.id}
                    pkg={selectedPackage}
                    onSyncPackage={handleSyncPackage}
                    providersWithToken={providersWithToken}
                    isProvidersLoading={isProvidersLoading && !isStubMode}
                  />
                ) : (
                  <PMVStack gap={2} padding={10} align="start">
                    <PMText fontSize="sm" color="secondary">
                      Select a package from the list.
                    </PMText>
                  </PMVStack>
                )}
              </PMBox>
            </PMHStack>
          </PMBox>
        </PMVStack>
      )}
    </PMPage>
  );
}

function SummaryLine({
  hasAnyDrift,
  driftedInstalls,
  driftPackagesCount,
  totalPackagesCount,
  failedInstalls,
  cliRequiredInstalls,
}: Readonly<{
  hasAnyDrift: boolean;
  driftedInstalls: number;
  driftPackagesCount: number;
  totalPackagesCount: number;
  failedInstalls: number;
  cliRequiredInstalls: number;
}>) {
  if (!hasAnyDrift && failedInstalls === 0) {
    return (
      <PMHStack gap={2} align="center">
        <PMBox
          width="6px"
          height="6px"
          borderRadius="full"
          bg="green.500"
          flexShrink={0}
        />
        <PMText fontSize="sm" color="secondary">
          Every distribution is on the latest version.
        </PMText>
      </PMHStack>
    );
  }

  const pluralize = (n: number, word: string) => `${word}${n === 1 ? '' : 's'}`;

  return (
    <PMText fontSize="sm" color="secondary" lineHeight="1.6">
      {hasAnyDrift ? (
        <>
          <Metric value={driftedInstalls} tone="primary" />
          {` drifted ${pluralize(driftedInstalls, 'distribution')} in `}
          <Metric value={driftPackagesCount} tone="primary" />
          {` of ${totalPackagesCount} ${pluralize(totalPackagesCount, 'package')}`}
        </>
      ) : (
        <>
          <Metric value={failedInstalls} tone="error" />
          {` ${pluralize(failedInstalls, 'distribution')} failed`}
        </>
      )}
      {hasAnyDrift && failedInstalls > 0 && (
        <>
          {' · '}
          <Metric value={failedInstalls} tone="error" />
          {' failed'}
        </>
      )}
      {cliRequiredInstalls > 0 && hasAnyDrift && (
        <>
          {', '}
          <Metric value={cliRequiredInstalls} tone="warning" />
          {' of which via '}
          <PMText
            as="span"
            fontFamily="mono"
            fontSize="xs"
            color="warning"
            paddingX={1}
            paddingY="1px"
            bg="background.tertiary"
            borderRadius="sm"
          >
            packmind-cli install
          </PMText>
        </>
      )}
    </PMText>
  );
}

function Metric({
  value,
  tone,
}: Readonly<{ value: number; tone: 'primary' | 'warning' | 'error' }>) {
  return (
    <PMText
      as="span"
      fontWeight="semibold"
      color={tone}
      fontVariantNumeric="tabular-nums"
    >
      {value}
    </PMText>
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
