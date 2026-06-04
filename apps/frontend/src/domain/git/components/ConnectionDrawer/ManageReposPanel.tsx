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
import { LuCheck, LuGitBranch, LuPencil, LuSearch } from 'react-icons/lu';
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

type TrackedRow = {
  key: string;
  tuple: RepoTuple;
};

type UntrackedRow = {
  key: string;
  owner: string;
  name: string;
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
  // Degraded mode: the provider can't enumerate repos (e.g. revoked token), but
  // our DB still knows what's tracked — so let users remove tracked tuples even
  // though they can't add new ones.
  const degraded = !available.isLoading && available.isError;

  const { trackedRows, untrackedRows, totalAvailable } = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const matchesTuple = (t: RepoTuple) =>
      !q ||
      `${t.owner}/${t.repo}`.toLowerCase().includes(q) ||
      t.branch.toLowerCase().includes(q);
    const matchesRepo = (owner: string, repo: string) =>
      !q || `${owner}/${repo}`.toLowerCase().includes(q);

    const sortedTuples = [...selection.tuples].sort((a, b) => {
      const aRepo = `${a.owner}/${a.repo}`;
      const bRepo = `${b.owner}/${b.repo}`;
      if (aRepo !== bRepo) return aRepo.localeCompare(bRepo);
      return a.branch.localeCompare(b.branch);
    });

    const tracked: TrackedRow[] = sortedTuples
      .filter(matchesTuple)
      .map((t) => ({ key: tupleKey(t), tuple: t }));

    const trackedRepoKeys = new Set(
      selection.tuples.map((t) => `${t.owner}/${t.repo}`),
    );

    const untracked: UntrackedRow[] = (available.data ?? [])
      .filter((r) => !trackedRepoKeys.has(r.fullName))
      .filter((r) => matchesRepo(r.owner, r.name))
      .map((r) => ({
        key: r.fullName,
        owner: r.owner,
        name: r.name,
        fullName: r.fullName,
        defaultBranch: r.defaultBranch,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));

    return {
      trackedRows: tracked,
      untrackedRows: untracked,
      totalAvailable: available.data?.length ?? 0,
    };
  }, [available.data, selection.tuples, filter]);

  if (isLoading) {
    return (
      <PMVStack gap={3} align="stretch">
        <SectionHeader trackedCount={0} totalAvailable={0} />
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

  const removeTuple = (t: RepoTuple) => {
    const target = tupleKey(t);
    onSelectionChange({
      tuples: selection.tuples.filter((x) => tupleKey(x) !== target),
    });
  };

  const addTuple = (t: RepoTuple) => {
    const target = tupleKey(t);
    if (selection.tuples.some((x) => tupleKey(x) === target)) return;
    onSelectionChange({ tuples: [...selection.tuples, t] });
  };

  const renameBranch = (t: RepoTuple, nextBranch: string) => {
    const nextTuple: RepoTuple = { ...t, branch: nextBranch };
    const nextKey = tupleKey(nextTuple);
    const oldKey = tupleKey(t);
    if (nextKey === oldKey) return;
    // Drop the renamed-into duplicate if it already exists (last write wins).
    const next = selection.tuples
      .filter((x) => tupleKey(x) !== nextKey)
      .map((x) => (tupleKey(x) === oldKey ? nextTuple : x));
    onSelectionChange({ tuples: next });
  };

  return (
    <PMVStack gap={3} align="stretch" flex={1} minH={0}>
      <SectionHeader
        trackedCount={selection.tuples.length}
        totalAvailable={totalAvailable}
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
                  Tracked repositories can still be removed. Re-authenticate to
                  add new ones.
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
          placeholder="Filter by name, path, or branch…"
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
        {!degraded && trackedRows.length === 0 && untrackedRows.length === 0 ? (
          <PMBox paddingX={4} paddingY={6} textAlign="center">
            <PMText color="secondary">No repositories match "{filter}".</PMText>
          </PMBox>
        ) : (
          <>
            {trackedRows.length > 0 && (
              <GroupHeader
                label="Tracked"
                count={trackedRows.length}
                emphasis
              />
            )}
            {trackedRows.map((row) => (
              <TrackedRepoRow
                key={row.key}
                tuple={row.tuple}
                canEditBranch={!degraded}
                onRemove={() => removeTuple(row.tuple)}
                onRenameBranch={(next) => renameBranch(row.tuple, next)}
              />
            ))}
            {degraded && (
              <>
                <GroupHeader label="Available" count={0} />
                <PMBox paddingX={4} paddingY={6} textAlign="center">
                  <PMText fontSize="sm" color="secondary">
                    Re-authenticate to discover new repositories.
                  </PMText>
                </PMBox>
              </>
            )}
            {!degraded && untrackedRows.length > 0 && (
              <GroupHeader label="Available" count={untrackedRows.length} />
            )}
            {!degraded &&
              untrackedRows.map((row) => (
                <UntrackedRepoRow
                  key={row.key}
                  fullName={row.fullName}
                  name={row.name}
                  defaultBranch={row.defaultBranch}
                  onAdd={() =>
                    addTuple({
                      owner: row.owner,
                      repo: row.name,
                      branch: row.defaultBranch,
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

const SectionHeader: React.FC<{
  trackedCount: number;
  totalAvailable: number;
  unknownTotal?: boolean;
}> = ({ trackedCount, totalAvailable, unknownTotal }) => (
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
      {trackedCount} tracked
      {!unknownTotal && totalAvailable > 0 ? ` / ${totalAvailable} repos` : ''}
    </PMText>
  </PMHStack>
);

const GroupHeader: React.FC<{
  label: string;
  count: number;
  emphasis?: boolean;
}> = ({ label, count, emphasis }) => (
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
        color={emphasis ? 'primary' : 'faded'}
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

const TrackedRepoRow: React.FC<{
  tuple: RepoTuple;
  canEditBranch: boolean;
  onRemove: () => void;
  onRenameBranch: (next: string) => void;
}> = ({ tuple, canEditBranch, onRemove, onRenameBranch }) => {
  const [editingBranch, setEditingBranch] = useState(false);
  const [draft, setDraft] = useState(tuple.branch);

  const startEdit = () => {
    setDraft(tuple.branch);
    setEditingBranch(true);
  };
  const commit = () => {
    const next = draft.trim();
    if (next && next !== tuple.branch) onRenameBranch(next);
    setEditingBranch(false);
  };
  const cancel = () => {
    setEditingBranch(false);
  };

  const fullName = `${tuple.owner}/${tuple.repo}`;

  return (
    <PMBox
      role="checkbox"
      aria-checked="true"
      tabIndex={0}
      data-testid="manage-repos-row"
      data-repo-key={tupleKey(tuple)}
      data-checked="true"
      onClick={editingBranch ? undefined : onRemove}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (editingBranch) return;
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onRemove();
        }
      }}
      paddingX={3}
      paddingY={2.5}
      borderBottom="1px solid"
      borderColor="border.tertiary"
      bg="background.tertiary"
      _hover={{ bg: 'background.tertiary' }}
      cursor={editingBranch ? 'default' : 'pointer'}
      transition="background 120ms ease-out"
    >
      <PMHStack gap={3} align="center">
        <PMBox
          aria-hidden
          width="16px"
          height="16px"
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
        <PMVStack gap={0.5} align="start" flex={1} minW={0}>
          <PMHStack gap={2} align="center" minW={0}>
            <PMText fontSize="sm" color="primary" fontWeight="medium" truncate>
              {tuple.repo}
            </PMText>
            <PMIcon fontSize="2xs" color="text.faded">
              <LuGitBranch />
            </PMIcon>
            {!canEditBranch ? (
              <PMText fontSize="xs" color="secondary">
                {tuple.branch}
              </PMText>
            ) : editingBranch ? (
              <PMInput
                size="xs"
                width="160px"
                value={draft}
                autoFocus
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDraft(e.target.value)
                }
                onBlur={commit}
                onKeyDown={(e: React.KeyboardEvent) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commit();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancel();
                  }
                }}
                data-testid="manage-repos-branch-input"
              />
            ) : (
              <PMBox
                as="button"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  startEdit();
                }}
                display="inline-flex"
                alignItems="center"
                gap={1}
                bg="transparent"
                border="none"
                padding="0"
                cursor="pointer"
                color="text.secondary"
                _hover={{ color: 'text.primary' }}
                data-testid="manage-repos-branch-edit"
              >
                <PMText fontSize="xs" color="secondary">
                  {tuple.branch}
                </PMText>
                <PMIcon fontSize="2xs">
                  <LuPencil />
                </PMIcon>
              </PMBox>
            )}
          </PMHStack>
          <PMText fontSize="xs" color="faded" truncate>
            {fullName}
          </PMText>
        </PMVStack>
      </PMHStack>
    </PMBox>
  );
};

const UntrackedRepoRow: React.FC<{
  fullName: string;
  name: string;
  defaultBranch: string;
  onAdd: () => void;
}> = ({ fullName, name, defaultBranch, onAdd }) => {
  return (
    <PMBox
      role="checkbox"
      aria-checked="false"
      tabIndex={0}
      data-testid="manage-repos-row"
      data-repo-key={fullName}
      data-checked="false"
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
      bg="transparent"
      _hover={{ bg: 'background.secondary' }}
      cursor="pointer"
      transition="background 120ms ease-out"
    >
      <PMHStack gap={3} align="center">
        <PMBox
          aria-hidden
          width="16px"
          height="16px"
          borderRadius="sm"
          borderWidth="1px"
          borderColor="border.secondary"
          bg="transparent"
          flexShrink={0}
        />
        <PMVStack gap={0.5} align="start" flex={1} minW={0}>
          <PMText fontSize="sm" color="secondary" truncate>
            {name}
          </PMText>
          <PMHStack gap={1.5} align="center" minW={0}>
            <PMText fontSize="xs" color="faded" truncate>
              {fullName}
            </PMText>
            <PMText fontSize="xs" color="faded">
              ·
            </PMText>
            <PMIcon fontSize="2xs" color="text.faded">
              <LuGitBranch />
            </PMIcon>
            <PMText fontSize="xs" color="faded">
              {defaultBranch}
            </PMText>
          </PMHStack>
        </PMVStack>
      </PMHStack>
    </PMBox>
  );
};

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
