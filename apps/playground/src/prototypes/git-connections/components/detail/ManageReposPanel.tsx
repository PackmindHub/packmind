import { useMemo, useState } from 'react';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMInput,
  PMText,
  PMVStack,
} from '@packmind/ui';
import {
  LuCheck,
  LuExternalLink,
  LuGitBranch,
  LuPencil,
  LuSearch,
  LuX,
} from 'react-icons/lu';
import type {
  AvailableRepo,
  RepoSelectionState,
  UserConnection,
} from '../../types';

type ManageReposPanelProps = {
  connection: UserConnection;
  draft: RepoSelectionState;
  onToggle: (repoId: string) => void;
  onBranchChange: (repoId: string, branch: string) => void;
};

export function ManageReposPanel({
  connection,
  draft,
  onToggle,
  onBranchChange,
}: Readonly<ManageReposPanelProps>) {
  const [filter, setFilter] = useState('');
  const trackedSet = useMemo(
    () => new Set(draft.trackedIds),
    [draft.trackedIds],
  );

  const { trackedRepos, untrackedRepos } = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const matches = (repo: AvailableRepo) =>
      !q || repo.path.toLowerCase().includes(q);
    const tracked: AvailableRepo[] = [];
    const untracked: AvailableRepo[] = [];
    for (const repo of connection.availableRepos) {
      if (!matches(repo)) continue;
      if (trackedSet.has(repo.id)) tracked.push(repo);
      else untracked.push(repo);
    }
    return { trackedRepos: tracked, untrackedRepos: untracked };
  }, [connection.availableRepos, filter, trackedSet]);

  const totalShown = trackedRepos.length + untrackedRepos.length;
  const totalAvailable = connection.availableRepos.length;

  return (
    <PMVStack gap={3} align="stretch">
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
          {draft.trackedIds.length}/{totalAvailable} tracked
        </PMText>
      </PMHStack>

      {connection.authMethod === 'app' && (
        <AppAccessHint
          identifier={connection.identifier}
          availableCount={totalAvailable}
        />
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
          placeholder="Filter by path…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          paddingLeft="30px"
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
      >
        {totalShown === 0 ? (
          <PMBox paddingX={4} paddingY={6} textAlign="center">
            <PMText fontSize="sm" color="secondary">
              No repositories match "{filter}".
            </PMText>
          </PMBox>
        ) : (
          <>
            {trackedRepos.length > 0 && (
              <GroupHeader
                label="Tracked"
                count={trackedRepos.length}
                emphasis
              />
            )}
            {trackedRepos.map((repo) => (
              <RepoRow
                key={repo.id}
                repo={repo}
                checked
                trackedBranch={
                  draft.branchByRepoId[repo.id] ?? repo.defaultBranch
                }
                onToggle={() => onToggle(repo.id)}
                onBranchChange={(branch) => onBranchChange(repo.id, branch)}
              />
            ))}
            {untrackedRepos.length > 0 && (
              <GroupHeader label="Available" count={untrackedRepos.length} />
            )}
            {untrackedRepos.map((repo) => (
              <RepoRow
                key={repo.id}
                repo={repo}
                checked={false}
                trackedBranch={repo.defaultBranch}
                onToggle={() => onToggle(repo.id)}
                onBranchChange={(branch) => onBranchChange(repo.id, branch)}
              />
            ))}
          </>
        )}
      </PMBox>
    </PMVStack>
  );
}

function GroupHeader({
  label,
  count,
  emphasis,
}: Readonly<{ label: string; count: number; emphasis?: boolean }>) {
  return (
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
}

type RepoRowProps = {
  repo: AvailableRepo;
  checked: boolean;
  trackedBranch: string;
  onToggle: () => void;
  onBranchChange: (branch: string) => void;
};

function RepoRow({
  repo,
  checked,
  trackedBranch,
  onToggle,
  onBranchChange,
}: Readonly<RepoRowProps>) {
  const [editingBranch, setEditingBranch] = useState(false);
  const [draftBranch, setDraftBranch] = useState(trackedBranch);
  const isOverride = checked && trackedBranch !== repo.defaultBranch;

  const commit = () => {
    const next = draftBranch.trim() || repo.defaultBranch;
    onBranchChange(next);
    setEditingBranch(false);
  };

  return (
    <PMBox
      as="div"
      role="button"
      aria-checked={checked}
      tabIndex={0}
      onClick={() => {
        if (!editingBranch) onToggle();
      }}
      onKeyDown={(e) => {
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
            {repo.path}
          </PMText>
          {checked && !editingBranch && (
            <PMHStack gap={1.5} align="center">
              <PMIcon fontSize="2xs" color="text.faded">
                <LuGitBranch />
              </PMIcon>
              <PMText fontSize="xs" color={isOverride ? 'primary' : 'faded'}>
                {trackedBranch}
                {!isOverride && ' (default)'}
              </PMText>
              <PMBox
                as="button"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  setDraftBranch(trackedBranch);
                  setEditingBranch(true);
                }}
                aria-label="Change tracked branch"
                bg="transparent"
                border="none"
                cursor="pointer"
                padding="2px"
                color="text.faded"
                _hover={{ color: 'text.primary' }}
                display="flex"
                alignItems="center"
              >
                <PMIcon fontSize="2xs">
                  <LuPencil />
                </PMIcon>
              </PMBox>
            </PMHStack>
          )}
          {checked && editingBranch && (
            <PMHStack gap={1.5} align="center">
              <PMIcon fontSize="2xs" color="text.faded">
                <LuGitBranch />
              </PMIcon>
              <PMInput
                size="xs"
                width="180px"
                value={draftBranch}
                placeholder={repo.defaultBranch}
                onChange={(e) => setDraftBranch(e.target.value)}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') commit();
                  else if (e.key === 'Escape') setEditingBranch(false);
                }}
                autoFocus
              />
              <PMBox
                as="button"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  commit();
                }}
                aria-label="Save branch override"
                bg="transparent"
                border="none"
                cursor="pointer"
                padding="2px"
                color="text.faded"
                _hover={{ color: 'success' }}
                display="flex"
                alignItems="center"
              >
                <PMIcon fontSize="xs">
                  <LuCheck />
                </PMIcon>
              </PMBox>
              <PMBox
                as="button"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  setEditingBranch(false);
                }}
                aria-label="Cancel branch override"
                bg="transparent"
                border="none"
                cursor="pointer"
                padding="2px"
                color="text.faded"
                _hover={{ color: 'error' }}
                display="flex"
                alignItems="center"
              >
                <PMIcon fontSize="xs">
                  <LuX />
                </PMIcon>
              </PMBox>
            </PMHStack>
          )}
        </PMVStack>
      </PMHStack>
    </PMBox>
  );
}

function AppAccessHint({
  identifier,
  availableCount,
}: Readonly<{ identifier: string; availableCount: number }>) {
  return (
    <PMBox
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      padding={3}
      bg="background.secondary"
    >
      <PMHStack gap={3} align="flex-start">
        <PMVStack gap={1} align="start" flex={1}>
          <PMText fontSize="xs" color="secondary">
            {availableCount} {availableCount === 1 ? 'repo' : 'repos'} were
            granted to the Packmind GitHub App on{' '}
            <PMText as="span" fontWeight="medium" color="primary">
              {identifier}
            </PMText>
            . Toggle which ones to track here. Grant access to more from
            github.com.
          </PMText>
        </PMVStack>
        <PMButton variant="ghost" size="xs" asChild>
          <a
            href={`https://${identifier.split('/')[0]}/settings/installations`}
            target="_blank"
            rel="noreferrer"
          >
            <PMHStack gap={1.5} align="center">
              <PMText fontSize="xs" color="primary" fontWeight="medium">
                Manage on GitHub
              </PMText>
              <PMIcon fontSize="2xs" color="branding.primary">
                <LuExternalLink />
              </PMIcon>
            </PMHStack>
          </a>
        </PMButton>
      </PMHStack>
    </PMBox>
  );
}
