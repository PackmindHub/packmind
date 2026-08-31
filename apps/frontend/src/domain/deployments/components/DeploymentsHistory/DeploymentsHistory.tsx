import React from 'react';
import {
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMBadge,
  PMEmptyState,
  PMPageSection,
  PMSpinner,
  PMText,
  PMBox,
  PMHeading,
  PMLink,
  PMTooltip,
  PMIcon,
} from '@packmind/ui';
import { LuInfo } from 'react-icons/lu';
import { Distribution, RenderMode, DistributedPackage } from '@packmind/types';
import { format } from 'date-fns';
import { Link } from 'react-router';
import { routes } from '../../../../shared/utils/routes';

export type DeploymentType = 'recipe' | 'standard' | 'skill' | 'package';

/** Paths that mean "the repository itself", which the target line leaves out. */
const ROOT_TARGET_PATHS = new Set(['', '/', '.', './']);

interface DeploymentsHistoryProps {
  deployments: Distribution[];
  type: DeploymentType;
  entityId: string;
  usersMap?: Record<string, string>;
  loading?: boolean;
  error?: string | null;
  title?: string;
  orgSlug?: string;
  spaceSlug?: string;
  hidePackageColumn?: boolean;
  hideVersionColumn?: boolean;
}

export const DeploymentsHistory: React.FC<DeploymentsHistoryProps> = ({
  deployments,
  type,
  entityId,
  usersMap,
  loading,
  error,
  title = 'Distribution History',
  orgSlug,
  spaceSlug,
  hidePackageColumn = false,
  hideVersionColumn = false,
}) => {
  if (loading) {
    return (
      <PMBox p={4} borderRadius="md" shadow="sm">
        <PMHeading level="h2">Loading Deployments...</PMHeading>
        <PMBox display="flex" justifyContent="center" mt={4}>
          <PMSpinner size="xl" color="blue.500" />
        </PMBox>
      </PMBox>
    );
  }

  if (error) {
    return (
      <PMBox
        p={4}
        borderRadius="md"
        shadow="sm"
        borderLeft="4px solid"
        borderLeftColor="red.500"
      >
        <PMHeading level="h2">Error Loading Deployments</PMHeading>
        <PMText as="p" variant="body">
          {error}
        </PMText>
      </PMBox>
    );
  }

  if (!deployments || deployments.length === 0) {
    return <PMEmptyState title={`No distributions found for this ${type}.`} />;
  }

  const getStatusBadge = (status: string, fallback?: string) => {
    if (status === 'in_progress')
      return <PMBadge colorPalette="blue">In Progress</PMBadge>;
    if (status === 'success')
      return <PMBadge colorPalette="green">Success</PMBadge>;
    if (status === 'failure')
      return <PMBadge colorPalette="red">Failed</PMBadge>;
    if (status === 'no_changes')
      return <PMBadge colorPalette="blue">No Changes</PMBadge>;
    return <PMBadge colorPalette="green">{fallback || 'Distributed'}</PMBadge>;
  };

  const getVersion = (deployment: Distribution) => {
    if (type === 'package') {
      // Packages don't have versions like recipes/standards
      return '-';
    }

    // Search through all distributed packages for the version
    for (const dp of deployment.distributedPackages || []) {
      if (type === 'recipe') {
        const recipeVersion = dp.recipeVersions?.find(
          (v) => v.recipeId === entityId,
        );
        if (recipeVersion) {
          return recipeVersion.version;
        }
      } else if (type === 'standard') {
        const standardVersion = dp.standardVersions?.find(
          (v) => v.standardId === entityId,
        );
        if (standardVersion) {
          return standardVersion.version;
        }
      } else if (type === 'skill') {
        const skillVersion = dp.skillVersions?.find(
          (v) => v.skillId === entityId,
        );
        if (skillVersion) {
          return skillVersion.version;
        }
      }
    }

    return '-';
  };

  /*
   * The destination, repository first and on its own line.
   *
   * It used to be one sentence, "apps/api/ in owner/repo:main", which in a
   * 254px column wrapped onto three lines and set the height of every row in
   * the table. Nothing about it was scannable either: the part that changes
   * between rows sat in the middle of a phrase. Two lines, the name of the
   * place and then where in it, read down a column.
   */
  const getTargetInfo = (deployment: Distribution): React.ReactNode => {
    const target = deployment.target;
    if (!target) return 'No target specified';
    const place = target.gitRepo
      ? `${target.gitRepo.owner}/${target.gitRepo.repo}`
      : `Repository ${target.gitRepoId}`;
    const isRoot = ROOT_TARGET_PATHS.has(target.path);
    const detail = [target.gitRepo?.branch, isRoot ? null : target.path]
      .filter(Boolean)
      .join(' · ');
    return (
      <PMBox minW={0}>
        <PMText
          as="div"
          variant="small"
          fontWeight="medium"
          truncate
          title={place}
        >
          {place}
        </PMText>
        {detail && (
          <PMText as="div" variant="small" color="faded" truncate>
            {detail}
          </PMText>
        )}
      </PMBox>
    );
  };

  const getCommitLinks = (deployment: Distribution) => {
    const commit = deployment.gitCommit;
    if (!commit) {
      if (deployment.status === 'in_progress') {
        return (
          <PMText as="span" variant="small" color="faded">
            Pending...
          </PMText>
        );
      }
      if (deployment.source === 'cli') {
        return (
          <PMTooltip
            label="This distribution was done using the Packmind CLI, no commit available"
            placement="top"
          >
            <PMBox display="inline-flex" cursor="help">
              <PMIcon as={LuInfo} color="gray.500" />
            </PMBox>
          </PMTooltip>
        );
      }
      return null;
    }
    /*
     * The sha and its subject on one line, cut by the column rather than at a
     * fixed fifty characters. Truncating in the string and then letting the
     * result wrap was the worst of both: the message was cut short and the row
     * still grew to three lines to hold what was left of it.
     */
    return (
      <PMBox display="flex" alignItems="baseline" gap={2} minW={0}>
        <PMLink
          variant="active"
          href={commit.url}
          target="_blank"
          rel="noopener noreferrer"
          flexShrink={0}
          fontFamily="mono"
        >
          {commit.sha.substring(0, 7)}
        </PMLink>
        {commit.message && (
          <PMText
            variant="small"
            color="secondary"
            truncate
            title={commit.message}
          >
            {commit.message}
          </PMText>
        )}
      </PMBox>
    );
  };

  const getAuthor = (deployment: Distribution) => {
    if (usersMap) {
      return usersMap[deployment.authorId || 'N/A'] || 'Unknown User';
    }
    return deployment.authorId || '-';
  };

  const getDate = (date: string) => (
    <PMText as="div" variant="small" whiteSpace="nowrap">
      {format(new Date(date), 'yyyy-MM-dd HH:mm')}
    </PMText>
  );

  const getMessage = (deployment: Distribution): React.ReactNode => {
    const text = (() => {
      if (deployment.status === 'failure' && deployment.error)
        return deployment.error;
      if (deployment.status === 'no_changes')
        return 'No changes detected, already up to date';
      return null;
    })();
    if (!text) return <PMText color="faded">-</PMText>;
    /*
     * One line with the rest under the pointer. An error is three wrapped lines
     * of prose in this column, and a row that tall on every failure is what
     * makes a log of forty events four screens of scrolling.
     */
    return (
      <PMText as="div" variant="small" truncate title={text}>
        {text}
      </PMText>
    );
  };

  const getPackageInfo = (deployment: Distribution): React.ReactNode => {
    const packages = deployment.distributedPackages
      ?.map((dp) => dp.package)
      .filter(Boolean);

    if (!packages || packages.length === 0) return '-';

    // If we have orgSlug and spaceSlug, render as links
    if (orgSlug && spaceSlug) {
      return (
        <PMBox display="flex" flexDirection="column" gap={1}>
          {packages.map((pkg) => (
            <PMLink asChild key={pkg!.id} variant="active">
              <Link to={routes.space.toPackage(orgSlug, spaceSlug, pkg!.id)}>
                {pkg!.name}
              </Link>
            </PMLink>
          ))}
        </PMBox>
      );
    }

    // Otherwise just show names
    return packages.map((pkg) => pkg!.name).join(', ');
  };

  const getOperationBadge = (
    deployment: Distribution,
  ): React.ReactNode | null => {
    let distributedPackage: DistributedPackage | undefined;

    if (type === 'package') {
      distributedPackage = deployment.distributedPackages?.find(
        (dp: DistributedPackage) => dp.packageId === entityId,
      );
    } else if (type === 'recipe') {
      distributedPackage = deployment.distributedPackages?.find(
        (dp: DistributedPackage) =>
          dp.recipeVersions?.some((rv) => rv.recipeId === entityId),
      );
    } else if (type === 'standard') {
      distributedPackage = deployment.distributedPackages?.find(
        (dp: DistributedPackage) =>
          dp.standardVersions?.some((sv) => sv.standardId === entityId),
      );
    } else if (type === 'skill') {
      distributedPackage = deployment.distributedPackages?.find(
        (dp: DistributedPackage) =>
          dp.skillVersions?.some((sv) => sv.skillId === entityId),
      );
    }

    if (!distributedPackage) {
      return null;
    }

    if (distributedPackage.operation === 'remove') {
      return <PMText>Removed</PMText>;
    }

    return <PMText>Distributed</PMText>;
  };

  const baseColumns: PMTableColumn[] = [
    ...(hideVersionColumn
      ? []
      : [
          {
            key: 'version',
            header: 'Version',
            width: '80px',
            align: 'center',
          },
        ]),
    ...(hidePackageColumn
      ? []
      : [{ key: 'package', header: 'Package', width: '150px', align: 'left' }]),
    { key: 'target', header: 'Target', width: '210px', align: 'left' },
    {
      key: 'renderModes',
      header: 'Rendered for',
      width: '150px',
      align: 'left',
    },
    {
      key: 'operation',
      header: 'Operation',
      width: '90px',
      align: 'center',
    },
    { key: 'commits', header: 'Git Commits', width: '18%' },
    { key: 'author', header: 'Author', width: '110px' },
    {
      key: 'createdAt',
      header: 'Distributed At',
      width: '135px',
      align: 'left',
    },
    { key: 'status', header: 'Status', width: '100px', align: 'center' },
    { key: 'message', header: 'Message', grow: true, align: 'left' },
  ] as PMTableColumn[];

  const tableData: PMTableRow[] = deployments.map((deployment) => ({
    key: deployment.id,
    version: getVersion(deployment as Distribution),
    package: getPackageInfo(deployment),
    target: getTargetInfo(deployment),
    renderModes: <RenderModes renderModes={deployment.renderModes} />,
    operation: getOperationBadge(deployment),
    commits: getCommitLinks(deployment),
    author: getAuthor(deployment),
    createdAt: getDate(deployment.createdAt),
    status: getStatusBadge(deployment.status),
    message: getMessage(deployment),
  }));

  return (
    <PMPageSection title={title} headingLevel="h5">
      {/*
        Pinned header and the tighter of the two densities. A distribution log
        is read by running down one column at a time, and past the first
        screenful an unpinned header leaves a grid of cells with no names on
        it.
      */}
      <PMTable
        columns={baseColumns}
        data={tableData}
        striped={true}
        hoverable={true}
        size="sm"
        variant="line"
        stickyHeader
        /*
          Fixed layout, so the column widths above are the widths. Without it a
          cell that says it truncates still asks for the width of its longest
          unbroken line, and one error message pushes the table wider than the
          drawer: the reader gets a horizontal scrollbar under a log they are
          reading vertically.
        */
        tableProps={{ tableLayout: 'fixed', width: '100%' }}
      />
    </PMPageSection>
  );
};

const RenderModes: React.FunctionComponent<{ renderModes: RenderMode[] }> = ({
  renderModes,
}) => {
  const formatNames: Record<RenderMode, string> = {
    [RenderMode.AGENTS_MD]: 'AGENTS.md',
    [RenderMode.JUNIE]: 'Junie',
    [RenderMode.GH_COPILOT]: 'Github Copilot',
    [RenderMode.CLAUDE]: 'Claude',
    [RenderMode.CLAUDE_PLUGIN]: 'Claude Plugin',
    [RenderMode.COPILOT_PLUGIN]: 'Copilot Plugin',
    [RenderMode.CURSOR]: 'Cursor',
    [RenderMode.PACKMIND]: 'Packmind',
    [RenderMode.GITLAB_DUO]: 'Gitlab Duo',
    [RenderMode.CONTINUE]: 'Continue',
    [RenderMode.OPENCODE]: 'OpenCode',
    [RenderMode.CODEX]: 'Codex',
  };
  const formattedNames = renderModes.map(
    (renderMode) => formatNames[renderMode],
  );
  const packmindLabel = formatNames[RenderMode.PACKMIND];
  const reorderedNames = formattedNames.includes(packmindLabel)
    ? [
        ...formattedNames.filter((name) => name !== packmindLabel),
        packmindLabel,
      ]
    : formattedNames;
  const allNames = reorderedNames.join(', ');

  /*
   * One name and a count, with the rest under the pointer. The long form,
   * "AGENTS.md, Claude, and 1 other", ran to 230px of a column where the value
   * repeats down almost every row, and wrapped onto a second line as soon as
   * the names got longer than that.
   */
  if (reorderedNames.length > 1) {
    return (
      <PMTooltip label={allNames} placement="top">
        <PMText variant="small" truncate>
          {reorderedNames[0]}
          <PMText as="span" color="faded">
            {` +${reorderedNames.length - 1}`}
          </PMText>
        </PMText>
      </PMTooltip>
    );
  }

  return (
    <PMText variant="small" truncate>
      {allNames}
    </PMText>
  );
};
