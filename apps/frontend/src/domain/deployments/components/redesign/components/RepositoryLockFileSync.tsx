import { Fragment, ReactNode, useEffect, useState } from 'react';
import {
  PMAlert,
  PMBox,
  PMButton,
  PMIcon,
  PMText,
  PMTooltip,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import { LuFolderSync, LuTriangleAlert } from 'react-icons/lu';
import type { GitProviderId, LockFileTargetSyncResult } from '@packmind/types';
import { useCheckProviderAuthQuery } from '../../../../git/api/queries/GitProviderQueries';
import {
  deriveConnectionStatus,
  PROBE_FAILURE_DESCRIPTIONS,
} from '../../../../git/components/shared/connectionStatus';
import { useSyncRepositoryFromLockFilesMutation } from '../../../api/queries/DeploymentsQueries';
import {
  SYNC_CHECKING_GIT_CONNECTION,
  SYNC_FROM_REPOSITORY_LABEL,
  SYNC_NEEDS_GIT_CONNECTION,
  SYNC_WARNINGS_TITLE,
  syncedToastDescription,
  syncedToastTitle,
  olderCliLocksMessage,
  syncFromRepositoryTooltip,
  unknownPackagesFix,
  unknownPackagesMessage,
} from '../../lockFileSync';
import { ROOT_TARGET_LABEL } from '../selectors/installDriftEntries';
import type { RepositoryDrift, TargetRef } from '../types';

export function useRepositoryLockFileSync(
  repo: RepositoryDrift,
  providersWithToken: Set<GitProviderId>,
) {
  const [report, setReport] = useState<LockFileTargetSyncResult[]>([]);
  const hasAuth = providersWithToken.has(repo.repo.providerId);
  const probe = useCheckProviderAuthQuery(repo.repo.providerId, {
    enabled: hasAuth,
  });
  const connection = deriveConnectionStatus(probe, { hasAuth });
  const mutation = useSyncRepositoryFromLockFilesMutation();

  useEffect(() => {
    setReport([]);
  }, [repo.id]);

  const disabledReason = (() => {
    if (connection.kind === 'no_auth') return SYNC_NEEDS_GIT_CONNECTION;
    if (connection.kind === 'checking') return SYNC_CHECKING_GIT_CONNECTION;
    if (connection.kind === 'failing') {
      return `${SYNC_NEEDS_GIT_CONNECTION} ${PROBE_FAILURE_DESCRIPTIONS[connection.reason]}`;
    }
    return null;
  })();

  const sync = () =>
    mutation.mutate(
      { gitRepoId: repo.id },
      {
        onSuccess: ({ targets }) => {
          setReport(targets);
          pmToaster.create({
            type: 'success',
            title: syncedToastTitle(repo.branch),
            description: syncedToastDescription(
              targets.filter((target) => target.status === 'updated').length,
            ),
          });
        },
      },
    );

  return {
    sync,
    isSyncing: mutation.isPending,
    disabledReason,
    report,
  };
}

export function SyncFromRepositoryButton({
  branch,
  sync,
  isSyncing,
  disabledReason,
}: Readonly<{
  branch: string;
  sync: () => void;
  isSyncing: boolean;
  disabledReason: string | null;
}>) {
  return (
    <PMTooltip
      label={disabledReason ?? syncFromRepositoryTooltip(branch)}
      placement="top"
    >
      <PMBox display="inline-flex">
        <PMButton
          variant="secondary"
          size="sm"
          onClick={sync}
          disabled={disabledReason !== null || isSyncing}
          loading={isSyncing}
        >
          <PMIcon fontSize="sm">
            <LuFolderSync />
          </PMIcon>
          {SYNC_FROM_REPOSITORY_LABEL}
        </PMButton>
      </PMBox>
    </PMTooltip>
  );
}

export function LockFileSyncWarnings({
  report,
  targets,
}: Readonly<{
  report: LockFileTargetSyncResult[];
  targets: TargetRef[];
}>) {
  const targetOf = (result: LockFileTargetSyncResult) =>
    targets.find((target) => target.id === result.targetId);
  const fromOlderCli = report.filter((result) =>
    result.warnings.some((warning) => warning.type === 'lock_from_older_cli'),
  );
  const unknownPackages = new Map<string, LockFileTargetSyncResult[]>();
  for (const result of report) {
    for (const warning of result.warnings) {
      if (warning.type === 'unknown_package') {
        unknownPackages.set(warning.packageSlug, [
          ...(unknownPackages.get(warning.packageSlug) ?? []),
          result,
        ]);
      }
    }
  }
  if (fromOlderCli.length === 0 && unknownPackages.size === 0) {
    return null;
  }

  return (
    <PMAlert.Root status="warning">
      <PMAlert.Indicator>
        <PMIcon>
          <LuTriangleAlert />
        </PMIcon>
      </PMAlert.Indicator>
      <PMAlert.Content>
        <PMAlert.Title>{SYNC_WARNINGS_TITLE}</PMAlert.Title>
        <PMVStack gap={3} align="start" marginTop={2}>
          {fromOlderCli.length > 0 && (
            <PMAlert.Description>
              {olderCliLocksMessage(fromOlderCli.length)}{' '}
              <InlineList
                items={fromOlderCli.map((result) => ({
                  key: result.targetId,
                  node: (
                    <TargetLabel result={result} target={targetOf(result)} />
                  ),
                }))}
              />
            </PMAlert.Description>
          )}
          {unknownPackages.size > 0 && (
            <PMVStack gap={1} align="start">
              <PMAlert.Description>
                {unknownPackagesMessage(unknownPackages.size)}
              </PMAlert.Description>
              <PMVStack as="ul" gap={1} align="start" paddingLeft={4}>
                {[...unknownPackages].map(([slug, results]) => (
                  <PMAlert.Description as="li" key={slug}>
                    <PMText as="span" fontFamily="mono">
                      {slug}
                    </PMText>
                    , listed in{' '}
                    <InlineList
                      items={results.map((result) => ({
                        key: result.targetId,
                        node: (
                          <TargetLabel
                            result={result}
                            target={targetOf(result)}
                          />
                        ),
                      }))}
                    />
                  </PMAlert.Description>
                ))}
              </PMVStack>
              <PMAlert.Description>
                {unknownPackagesFix(unknownPackages.size)}
              </PMAlert.Description>
            </PMVStack>
          )}
        </PMVStack>
      </PMAlert.Content>
    </PMAlert.Root>
  );
}

function TargetLabel({
  result,
  target,
}: Readonly<{
  result: LockFileTargetSyncResult;
  target: TargetRef | undefined;
}>) {
  const isRoot = target ? !!target.isDefault : result.path === '/';
  if (isRoot) return ROOT_TARGET_LABEL;
  return (
    <PMText as="span" fontFamily="mono">
      {target?.name ?? result.path}
    </PMText>
  );
}

function InlineList({
  items,
}: Readonly<{ items: { key: string; node: ReactNode }[] }>) {
  return (
    <>
      {items.map(({ key, node }, index) => (
        <Fragment key={key}>
          {index > 0 && ', '}
          {node}
        </Fragment>
      ))}
    </>
  );
}
