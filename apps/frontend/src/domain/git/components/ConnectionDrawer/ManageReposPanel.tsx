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
import { ApplyProgress, RepoSelection } from './types';

export interface ManageReposPanelProps {
  provider: GitProviderUI;
  selection: RepoSelection;
  onSelectionChange: (next: RepoSelection) => void;
  progress: ApplyProgress | null;
}

export const ManageReposPanel: React.FC<ManageReposPanelProps> = ({
  provider,
  selection,
  onSelectionChange,
  progress,
}) => {
  const tracked = useGetRepositoriesByProviderQuery(provider.id);
  const available = useGetAvailableRepositoriesQuery(provider.id);
  const [filter, setFilter] = useState('');

  const isLoading = tracked.isLoading || available.isLoading;
  const isError = tracked.isError || available.isError;

  const { trackedRows, untrackedRows, totalAvailable } = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const trackedKeys = new Set(selection.trackedKeys);
    const rows: Array<{
      key: string;
      label: string;
      sublabel: string;
      defaultBranch: string;
    }> = (available.data ?? []).map((r) => ({
      key: r.fullName,
      label: r.name,
      sublabel: r.fullName,
      defaultBranch: r.defaultBranch,
    }));
    const matches = (row: { label: string; sublabel: string }) =>
      !q ||
      row.label.toLowerCase().includes(q) ||
      row.sublabel.toLowerCase().includes(q);

    const tIds: typeof rows = [];
    const uIds: typeof rows = [];
    for (const row of rows) {
      if (!matches(row)) continue;
      if (trackedKeys.has(row.key)) tIds.push(row);
      else uIds.push(row);
    }
    return {
      trackedRows: tIds,
      untrackedRows: uIds,
      totalAvailable: rows.length,
    };
  }, [available.data, filter, selection.trackedKeys]);

  if (isLoading) {
    return (
      <PMVStack gap={3} align="stretch">
        <SectionHeader trackedCount={0} totalAvailable={0} />
        <PMSkeleton h={8} w="full" rounded="md" />
        <PMSkeleton h={24} w="full" rounded="md" />
      </PMVStack>
    );
  }

  if (isError) {
    return (
      <PMAlert.Root status="error">
        <PMAlert.Indicator />
        <PMAlert.Title>Couldn't load repositories</PMAlert.Title>
        <PMAlert.Description>
          Check the connection's auth, then refresh. If the token expired, use
          Re-authenticate from the status block.
        </PMAlert.Description>
      </PMAlert.Root>
    );
  }

  const toggle = (key: string, defaultBranch: string) => {
    const tracked = new Set(selection.trackedKeys);
    const branches = { ...selection.branchByKey };
    if (tracked.has(key)) {
      tracked.delete(key);
    } else {
      tracked.add(key);
      branches[key] = branches[key] ?? defaultBranch;
    }
    onSelectionChange({
      trackedKeys: Array.from(tracked),
      branchByKey: branches,
    });
  };

  const setBranch = (key: string, branch: string) => {
    onSelectionChange({
      ...selection,
      branchByKey: { ...selection.branchByKey, [key]: branch },
    });
  };

  return (
    <PMVStack gap={3} align="stretch">
      <SectionHeader
        trackedCount={selection.trackedKeys.length}
        totalAvailable={totalAvailable}
      />

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
          placeholder="Filter by name or path…"
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
        overflow="hidden"
        bg="background.secondary"
        maxHeight="380px"
        overflowY="auto"
        data-testid="manage-repos-list"
      >
        {trackedRows.length === 0 && untrackedRows.length === 0 ? (
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
              <RepoRow
                key={row.key}
                rowKey={row.key}
                label={row.label}
                sublabel={row.sublabel}
                branch={selection.branchByKey[row.key] ?? row.defaultBranch}
                checked
                onToggle={() => toggle(row.key, row.defaultBranch)}
                onBranchChange={(next) => setBranch(row.key, next)}
              />
            ))}
            {untrackedRows.length > 0 && (
              <GroupHeader label="Available" count={untrackedRows.length} />
            )}
            {untrackedRows.map((row) => (
              <RepoRow
                key={row.key}
                rowKey={row.key}
                label={row.label}
                sublabel={row.sublabel}
                branch={row.defaultBranch}
                checked={false}
                onToggle={() => toggle(row.key, row.defaultBranch)}
                onBranchChange={() => undefined}
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
}> = ({ trackedCount, totalAvailable }) => (
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
      {trackedCount}/{totalAvailable} tracked
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

interface RepoRowProps {
  rowKey: string;
  label: string;
  sublabel: string;
  branch: string;
  checked: boolean;
  onToggle: () => void;
  onBranchChange: (next: string) => void;
}

const RepoRow: React.FC<RepoRowProps> = ({
  rowKey,
  label,
  sublabel,
  branch,
  checked,
  onToggle,
  onBranchChange,
}) => {
  const [editingBranch, setEditingBranch] = useState(false);
  const [draft, setDraft] = useState(branch);

  const startEdit = () => {
    setDraft(branch);
    setEditingBranch(true);
  };
  const commit = () => {
    const next = draft.trim();
    if (next && next !== branch) onBranchChange(next);
    setEditingBranch(false);
  };
  const cancel = () => {
    setEditingBranch(false);
  };

  return (
    <PMBox
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      data-testid="manage-repos-row"
      data-repo-key={rowKey}
      data-checked={checked}
      onClick={editingBranch ? undefined : onToggle}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (editingBranch) return;
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onToggle();
        }
      }}
      paddingX={3}
      paddingY={2.5}
      borderBottom="1px solid"
      borderColor="border.tertiary"
      bg={checked ? 'background.tertiary' : 'transparent'}
      _hover={{
        bg: checked ? 'background.tertiary' : 'background.secondary',
      }}
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
          borderColor={checked ? 'branding.primary' : 'border.secondary'}
          bg={checked ? 'branding.primary' : 'transparent'}
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          {checked && (
            <PMIcon fontSize="2xs" color="background.primary">
              <LuCheck />
            </PMIcon>
          )}
        </PMBox>
        <PMVStack gap={0.5} align="start" flex={1} minW={0}>
          <PMText
            fontSize="sm"
            color={checked ? 'primary' : 'secondary'}
            fontWeight={checked ? 'medium' : 'normal'}
            truncate
          >
            {label}
          </PMText>
          <PMHStack gap={1.5} align="center">
            <PMText fontSize="xs" color="faded" truncate>
              {sublabel}
            </PMText>
            {checked && (
              <>
                <PMText fontSize="xs" color="faded">
                  ·
                </PMText>
                <PMIcon fontSize="2xs" color="text.faded">
                  <LuGitBranch />
                </PMIcon>
                {editingBranch ? (
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
                    color="text.faded"
                    _hover={{ color: 'text.primary' }}
                    data-testid="manage-repos-branch-edit"
                  >
                    <PMText fontSize="xs" color="faded">
                      {branch}
                    </PMText>
                    <PMIcon fontSize="2xs">
                      <LuPencil />
                    </PMIcon>
                  </PMBox>
                )}
              </>
            )}
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
