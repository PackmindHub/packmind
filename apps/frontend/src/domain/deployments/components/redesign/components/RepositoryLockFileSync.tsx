import { Fragment, useEffect, useState } from 'react';
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
import { LuFileLock, LuTriangleAlert } from 'react-icons/lu';
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
  OLDER_CLI_LOCK_MESSAGE,
  syncFromRepositoryTooltip,
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
            <LuFileLock />
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
  const flagged = report.filter((result) => result.warnings.length > 0);
  if (flagged.length === 0) return null;

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
          {flagged.map((result) => (
            <TargetWarnings
              key={result.targetId}
              result={result}
              target={targets.find((target) => target.id === result.targetId)}
            />
          ))}
        </PMVStack>
      </PMAlert.Content>
    </PMAlert.Root>
  );
}

function TargetWarnings({
  result,
  target,
}: Readonly<{
  result: LockFileTargetSyncResult;
  target: TargetRef | undefined;
}>) {
  const isRoot = target ? !!target.isDefault : result.path === '/';
  const unknownSlugs = result.warnings.flatMap((warning) =>
    warning.type === 'unknown_package' ? [warning.packageSlug] : [],
  );
  const fromOlderCli = result.warnings.some(
    (warning) => warning.type === 'lock_from_older_cli',
  );

  return (
    <PMVStack gap={1} align="start" as="section">
      <PMText
        fontSize="sm"
        fontWeight="medium"
        fontFamily={isRoot ? undefined : 'mono'}
      >
        {isRoot ? ROOT_TARGET_LABEL : (target?.name ?? result.path)}
      </PMText>
      {fromOlderCli && (
        <PMAlert.Description>{OLDER_CLI_LOCK_MESSAGE}</PMAlert.Description>
      )}
      {unknownSlugs.length > 0 && (
        <PMAlert.Description>
          {unknownPackagesMessage(unknownSlugs.length)}{' '}
          {unknownSlugs.map((slug, index) => (
            <Fragment key={slug}>
              {index > 0 && ', '}
              <PMText as="span" fontFamily="mono">
                {slug}
              </PMText>
            </Fragment>
          ))}
        </PMAlert.Description>
      )}
    </PMVStack>
  );
}
