import { useEffect, useMemo, useState } from 'react';
import {
  PMAlert,
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMNativeSelect,
  PMPage,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuChevronRight, LuRotateCw } from 'react-icons/lu';
import { PackageMasterRail } from './components/PackageMasterRail';
import { PackageDetailPane } from './components/PackageDetailPane';
import { SyncSurface, type SyncScope } from './components/SyncSurface';
import {
  packageHasDrift,
  packagesForScenario,
  sortPackagesByDriftFirst,
  totalBehindInstallCount,
} from './data';
import type { Scenario } from './types';

const SCENARIO_ITEMS: Array<{ label: string; value: Scenario }> = [
  { label: 'Default (mixed drift)', value: 'default' },
  { label: 'All aligned', value: 'aligned' },
  { label: 'Heavy drift', value: 'heavy' },
  { label: 'Stress (edge cases)', value: 'stress' },
];

export default function DeploymentsOverviewRedesignPrototype() {
  const [scenario, setScenario] = useState<Scenario>('default');
  const packages = useMemo(
    () => sortPackagesByDriftFirst(packagesForScenario(scenario)),
    [scenario],
  );

  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    () => packages[0]?.id ?? null,
  );

  useEffect(() => {
    const stillExists = packages.some((p) => p.id === selectedPackageId);
    if (!stillExists) {
      setSelectedPackageId(packages[0]?.id ?? null);
    }
  }, [packages, selectedPackageId]);

  const [syncScope, setSyncScope] = useState<SyncScope | null>(null);

  const selectedPackage = useMemo(
    () => packages.find((p) => p.id === selectedPackageId) ?? null,
    [packages, selectedPackageId],
  );

  const driftPackagesCount = packages.filter(packageHasDrift).length;
  const driftedInstalls = totalBehindInstallCount(packages);
  const hasAnyDrift = driftPackagesCount > 0;

  const handleSyncPackage = (packageId: string, installKeys?: string[]) => {
    setSyncScope({ kind: 'package', packageId, installKeys });
  };
  const handleSyncAll = () => {
    setSyncScope({ kind: 'all' });
  };

  return (
    <PMPage
      title="Overview"
      subtitle="Resolve drift between Packmind packages and their distributions."
      isFullWidth
      breadcrumbComponent={<Backlink />}
      actions={
        <PMHStack gap={3} align="center">
          <PMHStack gap={2} align="center">
            <PMText fontSize="xs" color="faded">
              Scenario
            </PMText>
            <PMNativeSelect
              items={SCENARIO_ITEMS.map((s) => ({
                label: s.label,
                value: s.value,
              }))}
              value={scenario}
              onChange={(e) => {
                setScenario(e.target.value as Scenario);
                setSyncScope(null);
              }}
              size="sm"
              width="220px"
            />
          </PMHStack>
          {syncScope === null && (
            <PMButton
              variant="primary"
              size="sm"
              disabled={!hasAnyDrift}
              onClick={handleSyncAll}
              title={
                hasAnyDrift
                  ? `Distribute all packages across ${driftedInstalls} drifted distribution${driftedInstalls === 1 ? '' : 's'}`
                  : 'Nothing to distribute — every distribution is on the latest version.'
              }
            >
              <PMIcon fontSize="sm">
                <LuRotateCw />
              </PMIcon>
              Distribute all
            </PMButton>
          )}
        </PMHStack>
      }
    >
      {syncScope !== null ? (
        <SyncSurface
          packages={packages}
          scope={syncScope}
          onCancel={() => setSyncScope(null)}
          onConfirm={() => {
            /* surface handles its own success step; close happens via onCancel */
          }}
        />
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
              <PackageMasterRail
                packages={packages}
                selectedPackageId={selectedPackage?.id ?? null}
                onSelect={setSelectedPackageId}
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
        color={tone === 'warn' ? 'orange.500' : 'text.primary'}
        fontVariantNumeric="tabular-nums"
        lineHeight="1"
        letterSpacing="-0.02em"
      >
        {value}
      </PMText>
      <PMText fontSize="sm" color="text.secondary">
        {label}
      </PMText>
    </PMHStack>
  );
}

function Backlink() {
  return (
    <PMBox
      as="button"
      type="button"
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
