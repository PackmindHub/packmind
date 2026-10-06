import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  PMAlert,
  PMBox,
  PMButton,
  PMCombobox,
  PMHStack,
  PMIcon,
  PMIconButton,
  PMInput,
  PMSkeleton,
  PMSpinner,
  PMText,
  PMVStack,
  pmCreateListCollection,
} from '@packmind/ui';
import {
  LuCheck,
  LuCircleAlert,
  LuGitBranch,
  LuSearch,
  LuSearchX,
  LuX,
} from 'react-icons/lu';
import { GitProviderId, GitRepoId } from '@packmind/types';
import { GitProviderUI } from '../../types/GitProviderTypes';
import {
  useCheckProviderBranchExistsMutation,
  useCheckTrackedBranchExistsQuery,
  useSearchProviderBranchesQuery,
  useGetAvailableRepositoriesQuery,
  useGetRepositoriesByProviderQuery,
} from '../../api/queries';
import {
  ApplyProgress,
  RepoSelection,
  RepoTuple,
  repoKey,
  tupleKey,
} from './types';
import { DeletedBranchBadge } from '../../../../shared/components/DeletedBranchBadge';
import { useDebouncedValue } from '../../../../shared/hooks';

export interface ManageReposPanelProps {
  provider: GitProviderUI;
  selection: RepoSelection;
  onSelectionChange: (next: RepoSelection) => void;
  progress: ApplyProgress | null;
  onRequestReauth: () => void;
  /**
   * Whether a branch name is being typed. The drawer closes on Escape, which
   * would otherwise swallow the Escape meant to cancel the branch input.
   */
  onEditingBranchChange?: (editing: boolean) => void;
}

type TrackedGroup = {
  key: string;
  owner: string;
  repo: string;
  fullName: string;
  defaultBranch: string;
  trackedBranches: string[];
  /**
   * The one branch a tracked repository is on: the branch switched to in this
   * drawer, or else its saved tracked row. Absent for a legacy repository,
   * which has several untracked branches and shows them all.
   */
  trackedBranch?: string;
  knownFromProvider: boolean;
  /**
   * Repository id per already-saved branch. A branch the user just added in
   * this drawer has none, and is not probed: there is nothing tracked yet.
   */
  savedRepoIdByBranch: Map<string, GitRepoId>;
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
  onEditingBranchChange,
}) => {
  const tracked = useGetRepositoriesByProviderQuery(provider.id);
  const [branchEditors, setBranchEditors] = useState(0);
  const trackBranchEditing = useCallback(
    (editing: boolean) => setBranchEditors((n) => n + (editing ? 1 : -1)),
    [],
  );
  useEffect(() => {
    onEditingBranchChange?.(branchEditors > 0);
  }, [branchEditors, onEditingBranchChange]);
  useEffect(
    () => () => onEditingBranchChange?.(false),
    [onEditingBranchChange],
  );
  const available = useGetAvailableRepositoriesQuery(provider.id);
  const [filter, setFilter] = useState('');

  const isLoading = tracked.isLoading || available.isLoading;
  const degraded = !available.isLoading && available.isError;

  const { trackedGroups, untrackedRepos, repoCount, totalRepos, branchCount } =
    useMemo(() => {
      const q = filter.trim().toLowerCase();

      const trackedBranchByRepo = new Map<string, string>();
      for (const r of tracked.data ?? []) {
        if (r.isTracked) trackedBranchByRepo.set(repoKey(r), r.branch);
      }
      for (const [key, branch] of selection.switches) {
        trackedBranchByRepo.set(key, branch);
      }

      const groupMap = new Map<string, TrackedGroup>();
      for (const t of selection.tuples) {
        const key = repoKey(t);
        const trackedBranch = trackedBranchByRepo.get(key);
        // A tracked repository's untracked rows are kept, with their history,
        // but hidden: the repository is on one branch only.
        if (trackedBranch !== undefined && t.branch !== trackedBranch) {
          continue;
        }
        let group = groupMap.get(key);
        if (!group) {
          group = {
            key,
            owner: t.owner,
            repo: t.repo,
            fullName: key,
            defaultBranch: t.branch,
            trackedBranches: [],
            trackedBranch,
            knownFromProvider: false,
            savedRepoIdByBranch: new Map(),
          };
          groupMap.set(key, group);
        }
        group.trackedBranches.push(t.branch);
      }

      for (const r of available.data?.repositories ?? []) {
        const group = groupMap.get(r.fullName);
        if (group) {
          group.defaultBranch = r.defaultBranch;
          group.knownFromProvider = true;
        }
      }

      // Saved repositories carry the id the branch probe needs.
      for (const r of tracked.data ?? []) {
        groupMap
          .get(`${r.owner}/${r.repo}`)
          ?.savedRepoIdByBranch.set(r.branch, r.id);
      }

      for (const g of groupMap.values()) {
        g.trackedBranches.sort((a, b) => a.localeCompare(b));
      }

      const untrackedMap = new Map<string, UntrackedRepo>();
      for (const r of available.data?.repositories ?? []) {
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
      const branchCount = Array.from(groupMap.values()).reduce(
        (count, g) => count + g.trackedBranches.length,
        0,
      );

      const matchesGroup = (g: TrackedGroup) =>
        !q ||
        g.fullName.toLowerCase().includes(q) ||
        g.trackedBranches.some((b) => b.toLowerCase().includes(q));
      const matchesRepo = (r: UntrackedRepo) =>
        !q || r.fullName.toLowerCase().includes(q);

      const trackedGroups = Array.from(groupMap.values())
        .filter(matchesGroup)
        .sort((a, b) => a.fullName.localeCompare(b.fullName));
      // Keep the provider's order (GitHub: most recently updated first,
      // GitLab: most recent activity first) so paginated "Load more" results
      // append to the bottom instead of splicing into an alphabetical list.
      const untrackedRepos = Array.from(untrackedMap.values()).filter(
        matchesRepo,
      );

      return {
        trackedGroups,
        untrackedRepos,
        repoCount,
        totalRepos,
        branchCount,
      };
    }, [
      available.data,
      tracked.data,
      selection.tuples,
      selection.switches,
      filter,
    ]);

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
    onSelectionChange({ ...selection, tuples: [...selection.tuples, t] });
  };

  const removeTuple = (t: RepoTuple) => {
    const target = tupleKey(t);
    onSelectionChange({
      ...selection,
      tuples: selection.tuples.filter((x) => tupleKey(x) !== target),
    });
  };

  // A tracked repository shows one branch, so unticking it unticks the repo.
  const removeRepo = (key: string) => {
    onSelectionChange({
      ...selection,
      tuples: selection.tuples.filter((x) => repoKey(x) !== key),
    });
  };

  const switchBranch = (t: RepoTuple) => {
    const key = repoKey(t);
    const switches = new Map(selection.switches);
    switches.set(key, t.branch);
    onSelectionChange({
      tuples: [...selection.tuples.filter((x) => repoKey(x) !== key), t],
      switches,
    });
  };

  return (
    <PMVStack gap={3} align="stretch" flex={1} minH={0}>
      <Header
        trackedCount={branchCount}
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
                providerId={provider.id}
                canChange={!degraded || group.knownFromProvider}
                onEditingChange={trackBranchEditing}
                onSwitch={(branch) =>
                  switchBranch({ owner: group.owner, repo: group.repo, branch })
                }
                onRemove={(branch) =>
                  group.trackedBranch !== undefined
                    ? removeRepo(group.key)
                    : removeTuple({
                        owner: group.owner,
                        repo: group.repo,
                        branch,
                      })
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

        {available.hasNextPage && (
          <PMBox
            paddingX={3}
            paddingY={2.5}
            borderTop="1px solid"
            borderColor="border.tertiary"
            textAlign="center"
          >
            <PMButton
              variant="tertiary"
              size="xs"
              onClick={() => available.fetchNextPage()}
              loading={available.isFetchingNextPage}
              disabled={available.isFetchingNextPage}
              data-testid="manage-repos-load-more"
            >
              Load more repositories
            </PMButton>
          </PMBox>
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
  providerId: GitProviderId;
  canChange: boolean;
  onSwitch: (branch: string) => void;
  onRemove: (branch: string) => void;
  onEditingChange: (editing: boolean) => void;
}> = ({
  group,
  providerId,
  canChange,
  onSwitch,
  onRemove,
  onEditingChange,
}) => {
  const checkBranch = useCheckProviderBranchExistsMutation();
  const errorId = useId();
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!adding) return;
    onEditingChange(true);
    return () => onEditingChange(false);
  }, [adding, onEditingChange]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const currentBranch =
    group.trackedBranch ??
    (group.trackedBranches.length === 1 ? group.trackedBranches[0] : undefined);

  const startAdd = () => {
    setDraft('');
    setError(null);
    setAdding(true);
  };
  const cancelAdd = () => {
    setAdding(false);
    setDraft('');
    setError(null);
  };
  const commitSwitch = async () => {
    const next = draft.trim();
    if (!next || next === currentBranch) {
      cancelAdd();
      return;
    }
    setError(null);
    try {
      const { exists } = await checkBranch.mutateAsync({
        providerId,
        owner: group.owner,
        repo: group.repo,
        branch: next,
      });
      if (!exists) {
        setError(`Branch ${next} not found in ${group.fullName}`);
        return;
      }
      onSwitch(next);
      cancelAdd();
    } catch {
      setError(`Couldn't verify branch ${next}. Try again.`);
    }
  };

  const pickSuggestion = (branch: string) => {
    onSwitch(branch);
    cancelAdd();
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
        {canChange && !adding && (
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
            data-testid="manage-repos-change-branch"
          >
            <PMIcon fontSize="2xs">
              <LuGitBranch />
            </PMIcon>
            <PMText fontSize="xs" color="secondary" fontWeight="medium">
              change branch
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
          <BranchNameCombobox
            providerId={providerId}
            owner={group.owner}
            repo={group.repo}
            currentBranch={currentBranch}
            placeholder={group.defaultBranch}
            value={draft}
            checking={checkBranch.isPending}
            invalid={!!error}
            describedBy={error ? errorId : undefined}
            onChange={(value) => {
              setDraft(value);
              setError(null);
            }}
            onConfirm={() => void commitSwitch()}
            onPick={pickSuggestion}
            onCancel={cancelAdd}
          />
          {error && (
            <PMHStack gap={1.5} align="center" marginTop={1.5}>
              <PMIcon fontSize="xs" color="text.error" flexShrink={0}>
                <LuCircleAlert />
              </PMIcon>
              <PMText
                id={errorId}
                fontSize="xs"
                color="error"
                data-testid="manage-repos-branch-error"
              >
                {error}
              </PMText>
            </PMHStack>
          )}
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
          gitRepoId={group.savedRepoIdByBranch.get(branch)}
          onRemove={() => onRemove(branch)}
        />
      ))}
    </PMBox>
  );
};

const BRANCH_SEARCH_DEBOUNCE_MS = 250;

/**
 * Branch name input suggesting the repository's branches as the user types.
 * A suggestion switches right away, since the provider has just listed it; a
 * typed name is confirmed with Enter and checked by the caller.
 */
const BranchNameCombobox: React.FC<{
  providerId: GitProviderId;
  owner: string;
  repo: string;
  currentBranch?: string;
  placeholder: string;
  value: string;
  checking: boolean;
  invalid: boolean;
  describedBy?: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onPick: (branch: string) => void;
  onCancel: () => void;
}> = ({
  providerId,
  owner,
  repo,
  currentBranch,
  placeholder,
  value,
  checking,
  invalid,
  describedBy,
  onChange,
  onConfirm,
  onPick,
  onCancel,
}) => {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const typed = value.trim();
  const search = useDebouncedValue(typed, BRANCH_SEARCH_DEBOUNCE_MS);
  // Mounted only while the branch input is open, so it searches only then.
  const branches = useSearchProviderBranchesQuery({
    providerId,
    owner,
    repo,
    search,
  });

  const collection = useMemo(
    () =>
      pmCreateListCollection({
        items: (branches.data?.branches ?? [])
          .filter((branch) => branch !== currentBranch)
          .map((branch) => ({ label: branch, value: branch })),
      }),
    [branches.data, currentBranch],
  );
  const suggestionsShown = open && !branches.isError;

  return (
    <PMBox flex="1" minWidth={0}>
      <PMCombobox.Root
        collection={collection}
        size="xs"
        allowCustomValue
        openOnClick
        // Focused by the combobox itself so it sees the focus and reacts to typing.
        autoFocus
        // Left uncontrolled: feeding the text back in drops fast keystrokes.
        onInputValueChange={(e: { inputValue: string }) =>
          onChange(e.inputValue)
        }
        onValueChange={(e: { value: string[] }) => {
          const [picked] = e.value;
          if (picked) onPick(picked);
        }}
        open={open}
        lazyMount
        unmountOnExit
        onOpenChange={(e: { open: boolean }) => setOpen(e.open)}
        onHighlightChange={(e: { highlightedValue: string | null }) =>
          setHighlighted(e.highlightedValue)
        }
        disabled={checking}
        invalid={invalid}
        placeholder={placeholder}
        // The drawer clips its body: fixed positioning lets the list overflow it.
        positioning={{ strategy: 'fixed', gutter: 4 }}
      >
        <PMCombobox.Control
          display="flex"
          alignItems="center"
          gap={2}
          height={8}
          paddingLeft={2.5}
          paddingRight={1}
          borderWidth="1px"
          borderColor="border.tertiary"
          borderRadius="md"
          bg="background.primary"
          transition="border-color 120ms ease-out, box-shadow 120ms ease-out"
          _focusWithin={{
            borderColor: 'branding.primary',
            boxShadow: '0 0 0 1px {colors.branding.primary}',
          }}
          _invalid={{
            borderColor: 'text.error',
            _focusWithin: {
              borderColor: 'text.error',
              boxShadow: '0 0 0 1px {colors.text.error}',
            },
          }}
        >
          <PMIcon fontSize="xs" color="text.faded" flexShrink={0}>
            <LuGitBranch />
          </PMIcon>
          <PMCombobox.Input
            aria-describedby={describedBy}
            flex={1}
            minWidth={0}
            height="auto"
            paddingX={0}
            border="none"
            bg="transparent"
            fontSize="sm"
            color="text.primary"
            focusRing="none"
            _placeholder={{ color: 'text.faded' }}
            onKeyDown={(e: React.KeyboardEvent) => {
              // One key, two meanings: with the list open, Enter picks the
              // highlighted suggestion (the combobox does it) and Escape only
              // closes the list; otherwise they confirm or cancel the input.
              if (e.key === 'Enter') {
                if (open && highlighted !== null) return;
                e.preventDefault();
                onConfirm();
              } else if (e.key === 'Escape') {
                if (suggestionsShown) setOpen(false);
                else onCancel();
              }
            }}
            data-testid="manage-repos-branch-input"
          />
          {checking ? (
            <PMSpinner
              size="xs"
              color="text.faded"
              data-testid="manage-repos-branch-checking"
            />
          ) : (
            typed && (
              <KeyCap data-testid="manage-repos-branch-enter-hint">↵</KeyCap>
            )
          )}
          <PMIconButton
            variant="ghost"
            size="2xs"
            aria-label="Cancel"
            color="text.faded"
            _hover={{ color: 'text.primary', bg: 'background.tertiary' }}
            onClick={onCancel}
            disabled={checking}
            data-testid="manage-repos-branch-cancel"
          >
            <LuX />
          </PMIconButton>
        </PMCombobox.Control>
        {!branches.isError && (
          <PMCombobox.Positioner>
            <PMCombobox.Content
              bg="background.tertiary"
              borderWidth="1px"
              borderColor="border.secondary"
              borderRadius="md"
              boxShadow="lg"
              padding={1}
            >
              {branches.isLoading ? (
                <PMText fontSize="xs" color="faded" paddingX={2} paddingY={1.5}>
                  Searching…
                </PMText>
              ) : (
                <PMCombobox.Empty paddingX={2} paddingY={1.5}>
                  <PMHStack gap={2} align="center">
                    <PMIcon fontSize="xs" color="text.faded">
                      <LuSearchX />
                    </PMIcon>
                    <PMText fontSize="xs" color="faded">
                      {search
                        ? `No branch matches “${search}”`
                        : 'No other branch'}
                    </PMText>
                  </PMHStack>
                </PMCombobox.Empty>
              )}
              {collection.items.map((item) => (
                <PMCombobox.Item
                  item={item}
                  key={item.value}
                  gap={2}
                  paddingX={2}
                  paddingY={1.5}
                  borderRadius="sm"
                  cursor="pointer"
                  _highlighted={{ bg: 'blue.subtle' }}
                  data-testid="manage-repos-branch-option"
                >
                  <PMIcon fontSize="xs" color="text.faded" flexShrink={0}>
                    <LuGitBranch />
                  </PMIcon>
                  <PMCombobox.ItemText fontSize="sm" color="text.secondary">
                    <BranchNameMatch branch={item.label} typed={typed} />
                  </PMCombobox.ItemText>
                </PMCombobox.Item>
              ))}
              <PMText
                aria-hidden
                marginTop={1}
                paddingX={2}
                paddingTop={1.5}
                paddingBottom={0.5}
                borderTop="1px solid"
                borderColor="border.secondary"
                fontSize="0.6875rem"
                color="faded"
                data-testid="manage-repos-branch-hints"
              >
                ↑↓ navigate · ↵ switch · esc cancel
              </PMText>
            </PMCombobox.Content>
          </PMCombobox.Positioner>
        )}
      </PMCombobox.Root>
      {branches.isError && (
        <PMText
          fontSize="xs"
          color="faded"
          marginTop={1}
          data-testid="manage-repos-branch-search-error"
        >
          Couldn't load branches — you can still type a name
        </PMText>
      )}
    </PMBox>
  );
};

const KeyCap: React.FC<{
  children: React.ReactNode;
  'data-testid'?: string;
}> = ({ children, 'data-testid': testId }) => (
  <PMBox
    as="kbd"
    aria-hidden
    flexShrink={0}
    paddingX={1}
    lineHeight="1.4"
    borderWidth="1px"
    borderColor="border.secondary"
    borderRadius="sm"
    fontFamily="inherit"
    fontSize="0.6875rem"
    color="text.faded"
    data-testid={testId}
  >
    {children}
  </PMBox>
);

const BranchNameMatch: React.FC<{ branch: string; typed: string }> = ({
  branch,
  typed,
}) => {
  const start = typed ? branch.toLowerCase().indexOf(typed.toLowerCase()) : -1;
  if (start < 0) return <>{branch}</>;
  const end = start + typed.length;
  return (
    <>
      {branch.slice(0, start)}
      <PMBox
        as="mark"
        bg="transparent"
        color="branding.primary"
        fontWeight="medium"
        data-testid="manage-repos-branch-option-match"
      >
        {branch.slice(start, end)}
      </PMBox>
      {branch.slice(end)}
    </>
  );
};

const BranchRow: React.FC<{
  branch: string;
  /** Absent for a branch added in this drawer and not saved yet. */
  gitRepoId?: GitRepoId;
  onRemove: () => void;
}> = ({ branch, gitRepoId, onRemove }) => {
  const trackedBranch = useCheckTrackedBranchExistsQuery(gitRepoId);
  const branchDeleted = trackedBranch.data === false;

  return (
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
        {branchDeleted && <DeletedBranchBadge branch={branch} />}
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
