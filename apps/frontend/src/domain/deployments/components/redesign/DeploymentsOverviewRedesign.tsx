import { useMemo, useState } from 'react';
import {
  PMAlert,
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMPage,
  PMSpinner,
  PMTabs,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuChevronRight, LuFolderGit2, LuPackage } from 'react-icons/lu';
import { useNavigate, useSearchParams } from 'react-router';
import type {
  GitProviderId,
  GitRepoId,
  PackageId,
  TargetId,
} from '@packmind/types';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useGetGitProvidersQuery } from '../../../git/api/queries/GitProviderQueries';
import { useListActiveDistributedPackagesBySpaceQuery } from '../../api/queries/DeploymentsQueries';
import { routes } from '../../../../shared/utils/routes';
import {
  buildPackageDriftOverview,
  packageBehindInstallCount,
  packageHasDrift,
  sortPackagesByDriftFirst,
  totalBehindInstallCount,
  totalFailedInstallCount,
} from './selectors/buildPackageDriftOverview';
import {
  buildRepositoryDriftOverview,
  repositoryBehindInstallCount,
  repositoryFailedInstallCount,
  repositoryHasDrift,
  sortRepositoriesByDriftFirst,
  totalDriftedRepoCount,
  totalFailedRepoCount,
} from './selectors/buildRepositoryDriftOverview';
import { providersWithTokenSet } from './selectors/providerAuth';
import { PackageMasterRail } from './components/PackageMasterRail';
import { PackageDetailPane } from './components/PackageDetailPane';
import { RepositoryMasterRail } from './components/RepositoryMasterRail';
import { RepositoryDetailPane } from './components/RepositoryDetailPane';
import { SyncSurface, type SyncScope } from './components/SyncSurface';
import {
  STUB_PACKAGES,
  STUB_PROVIDER_OK,
  STUB_REPOSITORIES,
} from './stubPackages';
import type { PackageDrift, RepositoryDrift } from './types';

type ViewMode = 'packages' | 'repositories';

function readViewMode(searchParams: URLSearchParams): ViewMode {
  const value = searchParams.get('view');
  return value === 'repositories' ? 'repositories' : 'packages';
}

export function DeploymentsOverviewRedesign() {
  const { organization } = useAuthContext();
  const { spaceSlug } = useCurrentSpace();
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
      <DeploymentsOverviewRedesignContent />
    </PMPage>
  );
}

export function DeploymentsOverviewRedesignContent() {
  const { organization } = useAuthContext();
  const { spaceId, spaceSlug, isReady } = useCurrentSpace();
  const [searchParams, setSearchParams] = useSearchParams();
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

  const repositories = useMemo<RepositoryDrift[]>(() => {
    if (isStubMode) return sortRepositoriesByDriftFirst(STUB_REPOSITORIES);
    return data
      ? sortRepositoriesByDriftFirst(buildRepositoryDriftOverview(data))
      : [];
  }, [data, isStubMode]);

  const viewMode = readViewMode(searchParams);
  const setViewMode = (next: ViewMode) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next === 'packages') params.delete('view');
        else params.set('view', next);
        // Clear cross-view selection when switching tabs.
        params.delete('package');
        params.delete('repo');
        return params;
      },
      { replace: false },
    );
  };

  const [selectedPackageId, setSelectedPackageId] = useState<PackageId | null>(
    null,
  );
  const [selectedRepositoryId, setSelectedRepositoryId] =
    useState<GitRepoId | null>(null);
  const [bulkSelected, setBulkSelected] = useState<Set<PackageId>>(
    () => new Set(),
  );
  const [bulkSelectedRepos, setBulkSelectedRepos] = useState<Set<GitRepoId>>(
    () => new Set(),
  );
  const selectedPackage = useMemo(
    () => packages.find((p) => p.id === selectedPackageId) ?? packages[0],
    [packages, selectedPackageId],
  );
  const selectedRepository = useMemo(
    () =>
      repositories.find((r) => r.id === selectedRepositoryId) ??
      repositories[0],
    [repositories, selectedRepositoryId],
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
  const handleToggleBulkRepo = (repoId: GitRepoId) => {
    setBulkSelectedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(repoId)) next.delete(repoId);
      else next.add(repoId);
      return next;
    });
  };
  const handleDistributeBulk = () => {
    if (bulkSelected.size === 0) return;
    setSyncScope({ kind: 'bulk', packageIds: Array.from(bulkSelected) });
  };
  const handleDistributeBulkRepos = () => {
    if (bulkSelectedRepos.size === 0) return;
    const scope = buildRepoBulkScope(repositories, bulkSelectedRepos);
    if (scope) setSyncScope(scope);
  };
  const handleSyncPackage = (packageId: PackageId, installKeys?: string[]) => {
    setSyncScope({ kind: 'package', packageId, installKeys });
  };
  const handleSyncPackageOnTarget = (
    packageId: PackageId,
    _repoId: GitRepoId,
    targetId: TargetId,
  ) => {
    setSyncScope({
      kind: 'package',
      packageId,
      installKeys: [`${_repoId}::${targetId}`],
    });
  };
  const handleSyncRepository = (repoId: GitRepoId) => {
    const scope = buildRepoBulkScope(repositories, new Set([repoId]));
    if (scope) setSyncScope(scope);
  };
  const handleDistributeAllDrifted = () => {
    if (viewMode === 'repositories') {
      const driftedRepoIds = repositories
        .filter(repositoryHasDrift)
        .map((r) => r.id);
      if (driftedRepoIds.length === 0) return;
      const scope = buildRepoBulkScope(repositories, new Set(driftedRepoIds));
      if (scope) {
        setBulkSelectedRepos(new Set(driftedRepoIds));
        setSyncScope(scope);
      }
      return;
    }
    const driftedIds = packages.filter(packageHasDrift).map((p) => p.id);
    if (driftedIds.length === 0) return;
    setBulkSelected(new Set(driftedIds));
    setSyncScope({ kind: 'bulk', packageIds: driftedIds });
  };

  const summary = useMemo(() => {
    if (viewMode === 'repositories') {
      return {
        driftedInstalls: repositories.reduce(
          (n, r) => n + repositoryBehindInstallCount(r),
          0,
        ),
        driftedGroupsCount: totalDriftedRepoCount(repositories),
        totalGroupsCount: repositories.length,
        failedInstalls: repositories.reduce(
          (n, r) => n + repositoryFailedInstallCount(r),
          0,
        ),
        failedGroupsCount: totalFailedRepoCount(repositories),
        groupNoun: 'repository' as const,
      };
    }
    return {
      driftedInstalls: totalBehindInstallCount(packages),
      driftedGroupsCount: packages.filter(packageHasDrift).length,
      totalGroupsCount: packages.length,
      failedInstalls: totalFailedInstallCount(packages),
      failedGroupsCount: packages.length,
      groupNoun: 'package' as const,
    };
  }, [viewMode, packages, repositories]);
  const driftedInstalls = summary.driftedInstalls;
  const driftPackagesCount = summary.driftedGroupsCount;
  const totalPackagesCount = summary.totalGroupsCount;
  const failedInstalls = summary.failedInstalls;
  const hasAnyDrift = driftPackagesCount > 0;
  const hasAnySignal = hasAnyDrift || failedInstalls > 0;
  const autoUpdateHref = organization
    ? routes.org.toSetupAutoUpdate(organization.slug)
    : null;
  const selectedPackageHistoryHref =
    organization && spaceSlug && selectedPackage
      ? `${routes.space.toPackage(organization.slug, spaceSlug, selectedPackage.id)}?tab=distributions`
      : null;
  const packageHistoryHref = (pkgId: PackageId) =>
    organization && spaceSlug
      ? `${routes.space.toPackage(organization.slug, spaceSlug, pkgId)}?tab=distributions`
      : null;
  const navigate = useNavigate();

  if (!isStubMode && (!isReady || isLoading)) return <LoadingState />;
  if (!isStubMode && isError) return <ErrorState />;
  if (!isStubMode && packages.length === 0) return <EmptyState />;

  if (syncScope !== null) {
    return (
      <SyncSurface
        packages={packages}
        scope={syncScope}
        providersWithToken={providersWithToken}
        isProvidersLoading={isProvidersLoading && !isStubMode}
        onCancel={() => setSyncScope(null)}
        onConfirm={() => {
          if (syncScope?.kind === 'bulk') {
            setBulkSelected(new Set());
            setBulkSelectedRepos(new Set());
          }
        }}
      />
    );
  }

  return (
    <PMVStack gap={4} align="stretch">
      {isStubMode && (
        <PMAlert.Root status="warning">
          <PMAlert.Indicator />
          <PMAlert.Title>
            Stub mode — fictional data. Clicking Distribute will hit the real
            backend with non-existent IDs and fail.
          </PMAlert.Title>
        </PMAlert.Root>
      )}
      <PMHStack
        justify="space-between"
        align="center"
        wrap="wrap"
        rowGap={2}
        columnGap={6}
        paddingX={1}
        paddingBottom={3}
        borderBottomWidth="1px"
        borderColor="border.tertiary"
      >
        <PMTabs
          value={viewMode}
          defaultValue={viewMode}
          onValueChange={(e: { value: string }) =>
            setViewMode(e.value as ViewMode)
          }
          variant="enclosed"
          size="sm"
          tabs={[
            {
              value: 'packages',
              triggerLabel: (
                <PMHStack gap={1.5} align="center">
                  <PMIcon fontSize="sm">
                    <LuPackage />
                  </PMIcon>
                  <PMText fontSize="sm">By packages</PMText>
                </PMHStack>
              ),
            },
            {
              value: 'repositories',
              triggerLabel: (
                <PMHStack gap={1.5} align="center">
                  <PMIcon fontSize="sm">
                    <LuFolderGit2 />
                  </PMIcon>
                  <PMText fontSize="sm">By repository</PMText>
                </PMHStack>
              ),
            },
          ]}
        />
        <PMHStack gap={4} align="center" wrap="wrap" rowGap={2}>
          <SummaryLine
            hasAnyDrift={hasAnyDrift}
            driftedInstalls={driftedInstalls}
            driftPackagesCount={driftPackagesCount}
            totalPackagesCount={totalPackagesCount}
            failedInstalls={failedInstalls}
            groupNoun={summary.groupNoun}
          />
          {hasAnySignal && (
            <PMHStack gap={2} flexShrink={0}>
              {hasAnyDrift && (
                <PMButton
                  variant="primary"
                  size="sm"
                  onClick={handleDistributeAllDrifted}
                >
                  Distribute drifted
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
      </PMHStack>
      <PMBox
        bg="background.primary"
        borderWidth="1px"
        borderColor="border.tertiary"
        borderRadius="md"
        overflow="hidden"
        height="calc(100vh - 200px)"
        minHeight="480px"
      >
        <PMHStack gap={0} align="stretch" height="100%">
          {viewMode === 'packages' ? (
            <>
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
                    distributionHistoryHref={selectedPackageHistoryHref}
                  />
                ) : (
                  <PMVStack gap={2} padding={10} align="start">
                    <PMText fontSize="sm" color="secondary">
                      Select a package from the list.
                    </PMText>
                  </PMVStack>
                )}
              </PMBox>
            </>
          ) : (
            <>
              <RepositoryMasterRail
                repositories={repositories}
                selectedRepositoryId={selectedRepository?.id ?? null}
                onSelect={setSelectedRepositoryId}
                bulkSelected={bulkSelectedRepos}
                onToggleBulk={handleToggleBulkRepo}
                onSetBulkSelection={setBulkSelectedRepos}
                onDistributeBulk={handleDistributeBulkRepos}
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
                {selectedRepository ? (
                  <RepositoryDetailPane
                    key={selectedRepository.id}
                    repo={selectedRepository}
                    providersWithToken={providersWithToken}
                    isProvidersLoading={isProvidersLoading && !isStubMode}
                    onSyncPackageOnTarget={handleSyncPackageOnTarget}
                    onSyncRepository={handleSyncRepository}
                    packageHistoryHref={packageHistoryHref}
                  />
                ) : (
                  <PMVStack gap={2} padding={10} align="start">
                    <PMText fontSize="sm" color="secondary">
                      No repository to display.
                    </PMText>
                  </PMVStack>
                )}
              </PMBox>
            </>
          )}
        </PMHStack>
      </PMBox>
    </PMVStack>
  );
}

/**
 * Pre-compute the SyncSurface scope for redistributing a set of repos:
 *   - packageIds = union of drifted packages across the selected repos
 *   - installKeyFilter = union of (repoId::targetId) of drifted installs
 *     across the selected repos
 * Returns null when no drift would be picked up.
 */
function buildRepoBulkScope(
  repositories: RepositoryDrift[],
  repoIds: Set<GitRepoId>,
): SyncScope | null {
  const packageIds = new Set<PackageId>();
  const installKeys = new Set<string>();
  for (const r of repositories) {
    if (!repoIds.has(r.id)) continue;
    for (const t of r.targets) {
      for (const p of t.packages) {
        if (packageBehindInstallCount(p) === 0) continue;
        packageIds.add(p.id);
        installKeys.add(`${r.id}::${t.id}`);
      }
    }
  }
  if (packageIds.size === 0 || installKeys.size === 0) return null;
  return {
    kind: 'bulk',
    packageIds: Array.from(packageIds),
    installKeyFilter: installKeys,
  };
}

function SummaryLine({
  hasAnyDrift,
  driftedInstalls,
  driftPackagesCount,
  totalPackagesCount,
  failedInstalls,
  groupNoun,
}: Readonly<{
  hasAnyDrift: boolean;
  driftedInstalls: number;
  driftPackagesCount: number;
  totalPackagesCount: number;
  failedInstalls: number;
  groupNoun: 'package' | 'repository';
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

  const pluralize = (n: number, word: string) =>
    `${word}${n === 1 ? '' : word.endsWith('y') ? 'ies' : 's'}`;
  const groupWord =
    groupNoun === 'repository'
      ? totalPackagesCount === 1
        ? 'repository'
        : 'repositories'
      : pluralize(totalPackagesCount, 'package');

  return (
    <PMText fontSize="sm" color="secondary" lineHeight="1.6">
      {hasAnyDrift ? (
        <>
          <Metric value={driftedInstalls} tone="primary" />
          {` drifted ${pluralize(driftedInstalls, 'distribution')} in `}
          <Metric value={driftPackagesCount} tone="primary" />
          {` of ${totalPackagesCount} ${groupWord}`}
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
