import React, { useMemo, useState } from 'react';
import {
  PMAlert,
  PMBox,
  PMHStack,
  PMIcon,
  PMInput,
  PMSkeleton,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuCheck, LuGitBranch, LuPlus, LuSearch } from 'react-icons/lu';
import { GitProviderUI } from '../../types/GitProviderTypes';
import {
  useGetAvailableRepositoriesQuery,
  useGetRepositoriesByProviderQuery,
} from '../../api/queries';
import { ApplyProgress, RepoSelection, RepoTuple, tupleKey } from './types';

export interface ManageReposPanelProps {
  provider: GitProviderUI;
  selection: RepoSelection;
  onSelectionChange: (next: RepoSelection) => void;
  progress: ApplyProgress | null;
  onRequestReauth: () => void;
}

type TrackedGroup = {
  key: string;
  owner: string;
  repo: string;
  fullName: string;
  defaultBranch: string;
  trackedBranches: string[];
  knownFromProvider: boolean;
};

type UntrackedRepo = {
  key: string;
  owner: string;
  repo: string;
  fullName: string;
  defaultBranch: string;
};

export const ManageReposPanel: React.FC<ManageReposPanelProps> = ({
  provider,
  selection,
  onSelectionChange,
  progress,
  onRequestReauth,
}) => {
  const tracked = useGetRepositoriesByProviderQuery(provider.id);
  const available = useGetAvailableRepositoriesQuery(provider.id);
  const [filter, setFilter] = useState('');

  const isLoading = tracked.isLoading || available.isLoading;
  const degraded = !available.isLoading && available.isError;

  const { trackedGroups, untrackedRepos, repoCount, totalRepos } =
    useMemo(() => {
      const q = filter.trim().toLowerCase();

      const groupMap = new Map<string, TrackedGroup>();
      const branchSets = new Map<string, Set<string>>();
      for (const t of selection.tuples) {
        const key = `${t.owner}/${t.repo}`;
        let group = groupMap.get(key);
        if (!group) {
          group = {
            key,
            owner: t.owner,
            repo: t.repo,
            fullName: key,
            defaultBranch: t.branch,
            trackedBranches: [],
            knownFromProvider: false,
          };
          groupMap.set(key, group);
          branchSets.set(key, new Set());
        }
        branchSets.get(key)?.add(t.branch);
        group.trackedBranches.push(t.branch);
      }

      for (const r of available.data ?? []) {
        const group = groupMap.get(r.fullName);
        if (group) {
          group.defaultBranch = r.defaultBranch;
          group.knownFromProvider = true;
        }
      }

      for (const g of groupMap.values()) {
        g.trackedBranches.sort((a, b) => a.localeCompare(b));
      }

      const untrackedMap = new Map<string, UntrackedRepo>();
      for (const r of available.data ?? []) {
        if (groupMap.has(r.fullName)) continue;
        untrackedMap.set(r.fullName, {
          key: r.fullName,
          owner: r.owner,
          repo: r.name,
          fullName: r.fullName,
          defaultBranch: r.defaultBranch,
        });
      }

      const totalRepos = groupMap.size + untrackedMap.size;
      const repoCount = groupMap.size;

      const matchesGroup = (g: TrackedGroup) =>
        !q ||
        g.fullName.toLowerCase().includes(q) ||
        g.trackedBranches.some((b) => b.toLowerCase().includes(q));
      const matchesRepo = (r: UntrackedRepo) =>
        !q || r.fullName.toLowerCase().includes(q);

      const trackedGroups = Array.from(groupMap.values())
        .filter(matchesGroup)
        .sort((a, b) => a.fullName.localeCompare(b.fullName));
      const untrackedRepos = Array.from(untrackedMap.values())
        .filter(matchesRepo)
        .sort((a, b) => a.fullName.localeCompare(b.fullName));

      return { trackedGroups, untrackedRepos, repoCount, totalRepos };
    }, [available.data, selection.tuples, filter]);

  if (isLoading) {
    return (
      <PMVStack gap={3} align="stretch">
        <Header trackedCount={0} repoCount={0} totalRepos={0} />
        <PMSkeleton h={8} w="full" rounded="md" />
        <PMSkeleton h={24} w="full" rounded="md" />
      </PMVStack>
    );
  }

  if (tracked.isError) {
    return (
      <PMAlert.Root status="error">
        <PMAlert.Indicator />
        <PMAlert.Content>
          <PMAlert.Title>Couldn't load repositories</PMAlert.Title>
          <PMAlert.Description>
            Check the connection's auth, then refresh. If the token expired, use
            Re-authenticate from the status block.
          </PMAlert.Description>
        </PMAlert.Content>
      </PMAlert.Root>
    );
  }

  const addTuple = (t: RepoTuple) => {
    const target = tupleKey(t);
    if (selection.tuples.some((x) => tupleKey(x) === target)) return;
    onSelectionChange({ tuples: [...selection.tuples, t] });
  };

  const removeTuple = (t: RepoTuple) => {
    const target = tupleKey(t);
    onSelectionChange({
      tuples: selection.tuples.filter((x) => tupleKey(x) !== target),
    });
  };

  return (
    <PMVStack gap={3} align="stretch" flex={1} minH={0}>
      <Header
        trackedCount={selection.tuples.length}
        repoCount={repoCount}
        totalRepos={totalRepos}
        unknownTotal={degraded}
      />

      {degraded && (
        <PMAlert.Root status="warning">
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Title>Connection can't list repositories</PMAlert.Title>
            <PMAlert.Description>
              <PMVStack gap={2} align="start">
                <PMText fontSize="sm" color="secondary">
                  Tracked branches can still be removed. Re-authenticate to add
                  new ones.
                </PMText>
                <PMBox
                  as="button"
                  onClick={onRequestReauth}
                  bg="transparent"
                  border="none"
                  padding="0"
                  cursor="pointer"
                  fontSize="xs"
                  color="text.primary"
                  fontWeight="medium"
                  textDecoration="underline"
                  textUnderlineOffset="2px"
                  _hover={{ color: 'branding.primary' }}
                  data-testid="manage-repos-reauth"
                >
                  Re-authenticate
                </PMBox>
              </PMVStack>
            </PMAlert.Description>
          </PMAlert.Content>
        </PMAlert.Root>
      )}

      <PMBox position="relative">
        <PMBox
          position="absolute"
          left="10px"
          top="50%"
          transform="translateY(-50%)"
          pointerEvents="none"
        >
          <PMIcon fontSize="xs" color="text.faded">
            <LuSearch />
          </PMIcon>
        </PMBox>
        <PMInput
          size="sm"
          placeholder="Filter by repo or branch…"
          value={filter}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFilter(e.target.value)
          }
          paddingLeft="30px"
          data-testid="manage-repos-filter"
        />
      </PMBox>

      <PMBox
        borderWidth="1px"
        borderColor="border.tertiary"
        borderRadius="md"
        bg="background.secondary"
        flex={1}
        minH={0}
        overflowX="hidden"
        overflowY="auto"
        data-testid="manage-repos-list"
      >
        {trackedGroups.length === 0 && untrackedRepos.length === 0 ? (
          <PMBox paddingX={4} paddingY={6} textAlign="center">
            <PMText color="secondary">
              {filter
                ? `No repositories match "${filter}".`
                : degraded
                  ? 'No tracked branches.'
                  : 'No repositories.'}
            </PMText>
          </PMBox>
        ) : (
          <>
            {trackedGroups.length > 0 && (
              <SectionLabel label="Tracked" count={trackedGroups.length} />
            )}
            {trackedGroups.map((group) => (
              <TrackedRepoSection
                key={group.key}
                group={group}
                canAdd={!degraded || group.knownFromProvider}
                onAdd={(branch) =>
                  addTuple({ owner: group.owner, repo: group.repo, branch })
                }
                onRemove={(branch) =>
                  removeTuple({ owner: group.owner, repo: group.repo, branch })
                }
              />
            ))}
            {untrackedRepos.length > 0 && (
              <SectionLabel label="Available" count={untrackedRepos.length} />
            )}
            {untrackedRepos.map((repo) => (
              <UntrackedRepoRow
                key={repo.key}
                repo={repo}
                onAdd={() =>
                  addTuple({
                    owner: repo.owner,
                    repo: repo.repo,
                    branch: repo.defaultBranch,
                  })
                }
              />
            ))}
          </>
        )}
      </PMBox>

      {progress && <ProgressIndicator progress={progress} />}
    </PMVStack>
  );
};

const Header: React.FC<{
  trackedCount: number;
  repoCount: number;
  totalRepos: number;
  unknownTotal?: boolean;
}> = ({ trackedCount, repoCount, totalRepos, unknownTotal }) => (
  <PMHStack justify="space-between" align="baseline">
    <PMText
      fontSize="xs"
      color="faded"
      textTransform="uppercase"
      letterSpacing="wider"
      fontWeight="semibold"
    >
      Manage repositories
    </PMText>
    <PMText fontSize="xs" color="faded">
      {trackedCount} branches · {repoCount} / {unknownTotal ? '—' : totalRepos}{' '}
      repos
    </PMText>
  </PMHStack>
);

const SectionLabel: React.FC<{ label: string; count: number }> = ({
  label,
  count,
}) => (
  <PMBox
    paddingX={3}
    paddingY={1.5}
    bg="background.tertiary"
    borderBottom="1px solid"
    borderColor="border.tertiary"
  >
    <PMHStack gap={2} align="baseline">
      <PMText
        fontSize="2xs"
        color="faded"
        textTransform="uppercase"
        letterSpacing="wider"
        fontWeight="semibold"
      >
        {label}
      </PMText>
      <PMText fontSize="2xs" color="faded">
        {count}
      </PMText>
    </PMHStack>
  </PMBox>
);

const UntrackedRepoRow: React.FC<{
  repo: UntrackedRepo;
  onAdd: () => void;
}> = ({ repo, onAdd }) => (
  <PMBox
    role="checkbox"
    aria-checked="false"
    tabIndex={0}
    data-testid="manage-repos-row"
    data-repo-key={repo.fullName}
    onClick={onAdd}
    onKeyDown={(e: React.KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onAdd();
      }
    }}
    paddingX={3}
    paddingY={2.5}
    borderBottom="1px solid"
    borderColor="border.tertiary"
    cursor="pointer"
    transition="background 120ms ease-out"
    _hover={{ bg: 'background.tertiary' }}
  >
    <PMHStack gap={3} align="center">
      <PMBox
        aria-hidden
        width="14px"
        height="14px"
        borderRadius="sm"
        borderWidth="1px"
        borderColor="border.secondary"
        bg="transparent"
        flexShrink={0}
      />
      <PMVStack gap={0.5} align="start" flex={1} minW={0}>
        <PMText fontSize="sm" color="secondary" truncate>
          {repo.fullName}
        </PMText>
        <PMHStack gap={1} align="center">
          <PMIcon fontSize="2xs" color="text.faded">
            <LuGitBranch />
          </PMIcon>
          <PMText fontSize="xs" color="faded">
            {repo.defaultBranch}
          </PMText>
        </PMHStack>
      </PMVStack>
    </PMHStack>
  </PMBox>
);

const TrackedRepoSection: React.FC<{
  group: TrackedGroup;
  canAdd: boolean;
  onAdd: (branch: string) => void;
  onRemove: (branch: string) => void;
}> = ({ group, canAdd, onAdd, onRemove }) => {
  const [adding, setAdding] = useState(false);
  const initialDraft = group.trackedBranches.includes(group.defaultBranch)
    ? ''
    : group.defaultBranch;
  const [draft, setDraft] = useState(initialDraft);

  const startAdd = () => {
    setDraft(
      group.trackedBranches.includes(group.defaultBranch)
        ? ''
        : group.defaultBranch,
    );
    setAdding(true);
  };
  const commitAdd = () => {
    const next = draft.trim();
    if (next && !group.trackedBranches.includes(next)) onAdd(next);
    setAdding(false);
    setDraft('');
  };
  const cancelAdd = () => {
    setAdding(false);
    setDraft('');
  };

  const hasTracked = group.trackedBranches.length > 0;

  return (
    <PMBox
      borderBottom="1px solid"
      borderColor="border.tertiary"
      data-testid="manage-repos-group"
      data-repo-key={group.fullName}
    >
      <PMHStack
        justify="space-between"
        align="center"
        paddingX={3}
        paddingY={2}
        bg="background.tertiary"
        borderBottom={hasTracked || adding ? '1px solid' : undefined}
        borderColor="border.tertiary"
      >
        <PMText fontSize="sm" color="primary" fontWeight="medium" truncate>
          {group.fullName}
        </PMText>
        {canAdd && !adding && (
          <PMBox
            as="button"
            onClick={startAdd}
            display="inline-flex"
            alignItems="center"
            gap={1}
            bg="transparent"
            border="none"
            padding="0"
            cursor="pointer"
            color="text.secondary"
            _hover={{ color: 'branding.primary' }}
            data-testid="manage-repos-add-branch"
          >
            <PMIcon fontSize="2xs">
              <LuPlus />
            </PMIcon>
            <PMText fontSize="xs" color="secondary" fontWeight="medium">
              branch
            </PMText>
          </PMBox>
        )}
      </PMHStack>

      {adding && (
        <PMBox
          paddingX={3}
          paddingY={2}
          borderBottom={hasTracked ? '1px solid' : undefined}
          borderColor="border.tertiary"
          bg="background.secondary"
        >
          <PMInput
            size="xs"
            autoFocus
            placeholder={group.defaultBranch}
            value={draft}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setDraft(e.target.value)
            }
            onBlur={commitAdd}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitAdd();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelAdd();
              }
            }}
            data-testid="manage-repos-branch-input"
          />
        </PMBox>
      )}

      {!hasTracked && !adding && (
        <PMBox paddingX={3} paddingY={2}>
          <PMText fontSize="xs" color="faded">
            No branches tracked.
          </PMText>
        </PMBox>
      )}

      {group.trackedBranches.map((branch) => (
        <BranchRow
          key={branch}
          branch={branch}
          onRemove={() => onRemove(branch)}
        />
      ))}
    </PMBox>
  );
};

const BranchRow: React.FC<{
  branch: string;
  onRemove: () => void;
}> = ({ branch, onRemove }) => (
  <PMBox
    role="checkbox"
    aria-checked="true"
    tabIndex={0}
    data-testid="manage-repos-row"
    data-branch={branch}
    onClick={onRemove}
    onKeyDown={(e: React.KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onRemove();
      }
    }}
    paddingX={3}
    paddingY={2}
    paddingLeft={6}
    cursor="pointer"
    transition="background 120ms ease-out"
    _hover={{ bg: 'background.tertiary' }}
  >
    <PMHStack gap={3} align="center">
      <PMBox
        aria-hidden
        width="14px"
        height="14px"
        borderRadius="sm"
        borderWidth="1px"
        borderColor="branding.primary"
        bg="branding.primary"
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
      >
        <PMIcon fontSize="2xs" color="background.primary">
          <LuCheck />
        </PMIcon>
      </PMBox>
      <PMIcon fontSize="2xs" color="text.faded">
        <LuGitBranch />
      </PMIcon>
      <PMText fontSize="sm" color="primary" truncate>
        {branch}
      </PMText>
    </PMHStack>
  </PMBox>
);

const ProgressIndicator: React.FC<{ progress: ApplyProgress }> = ({
  progress,
}) => {
  if (progress.phase === 'error') {
    return (
      <PMAlert.Root status="error">
        <PMAlert.Indicator />
        <PMAlert.Title>
          Stopped at step {progress.current}/{progress.total}
        </PMAlert.Title>
        <PMAlert.Description>
          {progress.errorMessage ?? 'An operation failed.'} The earlier changes
          were applied; revisit and apply again to finish.
        </PMAlert.Description>
      </PMAlert.Root>
    );
  }
  return (
    <PMBox
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      paddingX={3}
      paddingY={2}
      bg="background.secondary"
    >
      <PMText fontSize="xs" color="secondary">
        Updating repository {Math.min(progress.current + 1, progress.total)}/
        {progress.total}: {progress.label}
      </PMText>
    </PMBox>
  );
};
