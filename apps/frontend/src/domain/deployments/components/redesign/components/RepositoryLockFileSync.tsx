import { Fragment, ReactNode, useEffect, useState } from 'react';
import {
  PMAlert,
  PMBox,
  PMButton,
  PMIcon,
  PMIconButton,
  PMText,
  PMTooltip,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import { LuFolderSync, LuTriangleAlert, LuUnplug } from 'react-icons/lu';
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
  SYNC_CLI_ONLY,
  SYNC_WARNINGS_TITLE,
  syncedToastDescription,
  syncBrokenConnection,
  syncedToastTitle,
  olderCliLocksMessage,
  syncFromRepositoryTooltip,
  syncRepositoryLabel,
  syncRepositoryTooltip,
  unknownPackagesFix,
  unknownPackagesMessage,
} from '../../lockFileSync';
import { ROOT_TARGET_LABEL } from '../selectors/installDriftEntries';
import type { RepoRef, TargetRef } from '../types';

export function useRepositoryLockFileSync(
  { repo, branch }: { repo: RepoRef; branch: string },
  providersWithToken: Set<GitProviderId>,
  onSynced?: (report: LockFileTargetSyncResult[]) => void,
) {
  const [report, setReport] = useState<LockFileTargetSyncResult[]>([]);
  const hasAuth = providersWithToken.has(repo.providerId);
  const probe = useCheckProviderAuthQuery(repo.providerId, {
    enabled: hasAuth,
  });
  const connection = deriveConnectionStatus(probe, { hasAuth });
  const mutation = useSyncRepositoryFromLockFilesMutation();

  useEffect(() => {
    setReport([]);
  }, [repo.id]);

  const brokenReason =
    connection.kind === 'failing'
      ? PROBE_FAILURE_DESCRIPTIONS[connection.reason]
      : null;
  const disabledReason = (() => {
    if (connection.kind === 'no_auth') return SYNC_CLI_ONLY;
    if (connection.kind === 'checking') return SYNC_CHECKING_GIT_CONNECTION;
    if (brokenReason) return syncBrokenConnection(brokenReason);
    return null;
  })();

  const sync = () =>
    mutation.mutate(
      { gitRepoId: repo.id },
      {
        onSuccess: ({ targets }) => {
          setReport(targets);
          onSynced?.(targets);
          pmToaster.create({
            type: 'success',
            title: syncedToastTitle(branch),
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
    brokenReason,
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

export function SyncRepositoryIconButton({
  repo,
  branch,
  providersWithToken,
  onSynced,
}: Readonly<{
  repo: RepoRef;
  branch: string;
  providersWithToken: Set<GitProviderId>;
  onSynced: (report: LockFileTargetSyncResult[]) => void;
}>) {
  const { sync, isSyncing, disabledReason, brokenReason } =
    useRepositoryLockFileSync({ repo, branch }, providersWithToken, onSynced);
  const repoName = `${repo.owner}/${repo.name}`;

  return (
    <PMTooltip
      label={disabledReason ?? syncRepositoryTooltip(repoName, branch)}
      placement="top"
    >
      <PMBox display="inline-flex">
        <PMIconButton
          aria-label={syncRepositoryLabel(repoName)}
          variant="ghost"
          size="2xs"
          color={brokenReason ? 'warning' : 'text.faded'}
          _hover={{ color: brokenReason ? 'warning' : 'text.primary' }}
          onClick={sync}
          disabled={disabledReason !== null || isSyncing}
          loading={isSyncing}
        >
          {brokenReason ? <LuUnplug /> : <LuFolderSync />}
        </PMIconButton>
      </PMBox>
    </PMTooltip>
  );
}

export function LockFileSyncWarnings({
  report,
  targets,
  repoNameOf,
}: Readonly<{
  report: LockFileTargetSyncResult[];
  targets: TargetRef[];
  repoNameOf?: (result: LockFileTargetSyncResult) => string;
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
                    <TargetLabel
                      result={result}
                      target={targetOf(result)}
                      repoName={repoNameOf?.(result)}
                    />
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
                            repoName={repoNameOf?.(result)}
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
  repoName,
}: Readonly<{
  result: LockFileTargetSyncResult;
  target: TargetRef | undefined;
  repoName?: string;
}>) {
  const isRoot = target ? !!target.isDefault : result.path === '/';
  const label = isRoot ? (
    ROOT_TARGET_LABEL
  ) : (
    <PMText as="span" fontFamily="mono">
      {target?.name ?? result.path}
    </PMText>
  );
  if (!repoName) return label;
  return (
    <>
      {repoName} · {label}
    </>
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
