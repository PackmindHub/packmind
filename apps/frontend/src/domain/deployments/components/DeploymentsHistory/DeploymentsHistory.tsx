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
import { DeploymentsHistoryDataTestId } from '@packmind/frontend';
import {
  CommandDistributionHistoryEntry,
  DistributedPackageHistoryEntry,
  DistributionHistoryEntry,
  DistributionHistoryEntryOf,
  RenderMode,
  SkillDistributionHistoryEntry,
  StandardDistributionHistoryEntry,
} from '@packmind/types';
import { format } from 'date-fns';
import { Link } from 'react-router';
import { useSpaceNavMode } from '../../../organizations/components/SpaceNavModeContext';
import { packageHref } from '../context/buildComponentDetail';

export type DeploymentType = 'command' | 'standard' | 'skill' | 'package';

/** Paths that mean "the repository itself", which the target line leaves out. */
const ROOT_TARGET_PATHS = new Set(['', '/', '.', './']);

type DeploymentsHistoryProps = {
  entityId: string;
  usersMap?: Record<string, string>;
  loading?: boolean;
  error?: string | null;
  title?: string;
  orgSlug?: string;
  spaceSlug?: string;
  hidePackageColumn?: boolean;
  hideVersionColumn?: boolean;
} & (
  | { type: 'package'; deployments: DistributionHistoryEntry[] }
  | { type: 'command'; deployments: CommandDistributionHistoryEntry[] }
  | { type: 'standard'; deployments: StandardDistributionHistoryEntry[] }
  | { type: 'skill'; deployments: SkillDistributionHistoryEntry[] }
);

type HistoryRow = {
  deployment: DistributionHistoryEntry;
  version: string | number;
  removed: boolean;
};

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
  /*
   * Before the early returns below, which is not a style choice: this component
   * bails out on loading and on error, and a hook read after them would run on
   * some renders and not others.
   */
  const { mode } = useSpaceNavMode();

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

  /*
   * The test id travels on the badge rather than on the cell, because it is the
   * badge that carries the word: the e2e suite used to find this column by
   * counting cells, and the count moved the day the columns around it changed.
   * A name does not move.
   */
  const getStatusBadge = (status: string, fallback?: string) => {
    const testId = DeploymentsHistoryDataTestId.Status;
    if (status === 'in_progress')
      return (
        <PMBadge colorPalette="blue" data-testid={testId}>
          In Progress
        </PMBadge>
      );
    if (status === 'success')
      return (
        <PMBadge colorPalette="green" data-testid={testId}>
          Success
        </PMBadge>
      );
    if (status === 'failure')
      return (
        <PMBadge colorPalette="red" data-testid={testId}>
          Failed
        </PMBadge>
      );
    if (status === 'no_changes')
      return (
        <PMBadge colorPalette="blue" data-testid={testId}>
          No Changes
        </PMBadge>
      );
    return (
      <PMBadge colorPalette="green" data-testid={testId}>
        {fallback || 'Distributed'}
      </PMBadge>
    );
  };

  /**
   * The row for one distribution in an artifact's history, read from the first
   * distributed package carrying a version of that artifact: no version and no
   * removal when none does. The version column and the Removed badge both
   * describe that same package, so they are read in one pass.
   */
  const artifactHistoryRow = <DP extends DistributedPackageHistoryEntry>(
    deployment: DistributionHistoryEntryOf<DP>,
    versionIn: (distributedPackage: DP) => { version: number } | undefined,
  ): HistoryRow => {
    for (const dp of deployment.distributedPackages) {
      const carried = versionIn(dp);
      if (carried) {
        return {
          deployment,
          version: carried.version,
          removed: dp.operation === 'remove',
        };
      }
    }

    return { deployment, version: '-', removed: false };
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
  const getTargetInfo = (
    deployment: DistributionHistoryEntry,
    removed: boolean,
  ): React.ReactNode => {
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
          data-testid={DeploymentsHistoryDataTestId.DestinationRepository}
        >
          {place}
        </PMText>
        {/*
          A removal, beside the path it was removed from rather than in a
          column of its own that said "Distributed" on forty-three rows out of
          forty-four to carry this one. It sits on the second line because the
          first is a repository name that needs every pixel it has, and this
          one has room to spare.
        */}
        <PMBox display="flex" alignItems="center" gap={2} minW={0}>
          {detail && (
            <PMText
              as="div"
              variant="small"
              color="faded"
              truncate
              data-testid={DeploymentsHistoryDataTestId.DestinationDetail}
            >
              {detail}
            </PMText>
          )}
          {removed && (
            <PMBadge colorPalette="orange" size="sm" flexShrink={0}>
              Removed
            </PMBadge>
          )}
        </PMBox>
      </PMBox>
    );
  };

  const getCommitLinks = (deployment: DistributionHistoryEntry) => {
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

  const getAuthor = (deployment: DistributionHistoryEntry) => {
    if (usersMap) {
      return usersMap[deployment.authorId || 'N/A'] || 'Unknown User';
    }
    return deployment.authorId || '-';
  };

  /*
   * When, and under it who, the way the target cell carries the branch under
   * the repository. The author was a column of its own, and in a space with
   * one active developer it printed the same name on every row of the log for
   * a hundred and ten pixels. It is worth keeping, not worth a column.
   */
  const getWhen = (deployment: DistributionHistoryEntry): React.ReactNode => (
    <PMBox minW={0}>
      <PMText as="div" variant="small" whiteSpace="nowrap">
        {format(new Date(deployment.createdAt), 'yyyy-MM-dd HH:mm')}
      </PMText>
      <PMText as="div" variant="small" color="faded" truncate>
        {getAuthor(deployment)}
      </PMText>
    </PMBox>
  );

  const getMessage = (
    deployment: DistributionHistoryEntry,
  ): React.ReactNode => {
    const text = (() => {
      if (deployment.status === 'failure' && deployment.error)
        return deployment.error;
      if (deployment.status === 'no_changes')
        return 'No changes detected, already up to date';
      return null;
    })();
    if (!text) return <PMText color="faded">-</PMText>;
    /*
     * One line, but a wide one. This cell is why a failed row is read at all,
     * and it used to get whatever the eight columns before it had left over:
     * two hundred and eight pixels for a message asking for four hundred, so
     * every error was cut at "Push rejected: branch protectio…", one word
     * before the reason. Dropping the two columns that said the same value on
     * every row gives it the width instead.
     */
    return <ClippedText text={text} />;
  };

  const getPackageInfo = (
    deployment: DistributionHistoryEntry,
  ): React.ReactNode => {
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
              <Link to={packageHref(mode, { orgSlug, spaceSlug }, pkg!.id)}>
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
      width: '130px',
      align: 'left',
    },
    { key: 'commits', header: 'Git Commits', width: '18%' },
    {
      key: 'createdAt',
      header: 'Distributed At',
      width: '135px',
      align: 'left',
    },
    { key: 'status', header: 'Status', width: '86px', align: 'center' },
    { key: 'message', header: 'Message', grow: true, align: 'left' },
  ] as PMTableColumn[];

  let rows: HistoryRow[];
  if (type === 'package') {
    rows = deployments.map((deployment) => ({
      deployment,
      version: '-',
      removed:
        deployment.distributedPackages.find((dp) => dp.packageId === entityId)
          ?.operation === 'remove',
    }));
  } else if (type === 'command') {
    rows = deployments.map((deployment) =>
      artifactHistoryRow(deployment, (dp) =>
        dp.recipeVersions.find((version) => version.recipeId === entityId),
      ),
    );
  } else if (type === 'standard') {
    rows = deployments.map((deployment) =>
      artifactHistoryRow(deployment, (dp) =>
        dp.standardVersions.find((version) => version.standardId === entityId),
      ),
    );
  } else {
    rows = deployments.map((deployment) =>
      artifactHistoryRow(deployment, (dp) =>
        dp.skillVersions.find((version) => version.skillId === entityId),
      ),
    );
  }

  const tableData: PMTableRow[] = rows.map(
    ({ deployment, version, removed }) => ({
      key: deployment.id,
      version,
      package: getPackageInfo(deployment),
      target: getTargetInfo(deployment, removed),
      renderModes: <RenderModes renderModes={deployment.renderModes} />,
      commits: getCommitLinks(deployment),
      createdAt: getWhen(deployment),
      status: getStatusBadge(deployment.status),
      message: getMessage(deployment),
    }),
  );

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

/**
 * One line of text, with a tooltip only when the line is actually cut.
 *
 * An unconditional tooltip is the same mistake as the native `title` it
 * replaces: on a log of forty rows it pops a box over the next row to repeat a
 * sentence the reader can already see. The tooltip is worth having for the
 * error that does not fit, and only for that one, so the cell measures itself
 * and stays silent when there is nothing to add.
 *
 * It is a tooltip rather than a `title` because a `title` cannot be reached
 * from the keyboard, cannot be styled, and waits a second before appearing.
 */
const ClippedText: React.FunctionComponent<{ text: string }> = ({ text }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [isClipped, setIsClipped] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => setIsClipped(node.scrollWidth > node.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [text]);

  /*
   * A plain div rather than a PMBox: the measurement needs a ref on the very
   * element that clips, and PMBox does not forward one.
   */
  const line = (
    <div
      ref={ref}
      style={{
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        cursor: isClipped ? 'help' : undefined,
      }}
    >
      <PMText as="span" variant="small">
        {text}
      </PMText>
    </div>
  );

  if (!isClipped) return line;
  return (
    <PMTooltip label={text} placement="top">
      {line}
    </PMTooltip>
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
    [RenderMode.KIRO]: 'Kiro',
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
