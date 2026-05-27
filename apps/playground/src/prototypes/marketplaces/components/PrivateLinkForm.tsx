import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
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
  LuChevronDown,
  LuCheck,
  LuGitBranch,
  LuLock,
  LuSearch,
  LuShield,
} from 'react-icons/lu';
import { SiGithub, SiGitlab, SiBitbucket } from 'react-icons/si';
import type { Agent, ConnectedRepo, GitProvider } from '../types';
import { GIT_PROVIDER_LABEL } from '../types';
import { AgentsFieldset, FieldShell } from './AgentsFieldset';

type PrivateLinkFormProps = {
  gitConnected: boolean;
  provider: GitProvider | null;
  repos: ConnectedRepo[];
  selectedRepoId: string | null;
  onSelectRepo: (id: string) => void;
  name: string;
  onNameChange: (value: string) => void;
  agents: Agent[];
  onAgentToggle: (agent: Agent, checked: boolean) => void;
};

export function PrivateLinkForm({
  gitConnected,
  provider,
  repos,
  selectedRepoId,
  onSelectRepo,
  name,
  onNameChange,
  agents,
  onAgentToggle,
}: Readonly<PrivateLinkFormProps>) {
  if (!gitConnected) {
    return <ConnectProviderCard />;
  }

  const selectedRepo = repos.find((r) => r.id === selectedRepoId) ?? null;

  return (
    <PMVStack gap={4} align="stretch">
      <ConnectedProviderRow provider={provider} />

      <FieldShell
        label="Repository"
        helper="We read repo metadata to verify access; we never touch your code."
      >
        <RepoPickerMenu
          repos={repos}
          selectedRepo={selectedRepo}
          onSelect={onSelectRepo}
        />
      </FieldShell>

      <FieldShell
        label="Display name"
        helper="How this marketplace appears in Packmind."
      >
        <PMInput
          placeholder="e.g. Billing playbook"
          value={name}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onNameChange(e.target.value)
          }
          size="sm"
        />
      </FieldShell>

      <FieldShell
        label="Render packages for"
        helper="Each agent gets its native file format on publish."
      >
        <AgentsFieldset agents={agents} onToggle={onAgentToggle} />
      </FieldShell>
    </PMVStack>
  );
}

// ── Connect-provider state ───────────────────────────────────────────────────

function ConnectProviderCard() {
  const providers: Array<{
    id: GitProvider;
    label: string;
    icon: React.ReactNode;
  }> = [
    { id: 'github', label: 'GitHub', icon: <SiGithub /> },
    { id: 'gitlab', label: 'GitLab', icon: <SiGitlab /> },
    { id: 'bitbucket', label: 'Bitbucket', icon: <SiBitbucket /> },
  ];

  return (
    <PMBox
      bg="background.secondary"
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      paddingX={4}
      paddingY={4}
    >
      <PMVStack gap={3} align="stretch">
        <PMHStack gap={2.5} align="start">
          <PMBox
            width="32px"
            height="32px"
            borderRadius="sm"
            bg="background.tertiary"
            color="branding.primary"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
          >
            <PMIcon fontSize="sm">
              <LuShield />
            </PMIcon>
          </PMBox>
          <PMVStack gap={1} align="start" flex={1}>
            <PMText fontSize="sm" fontWeight="semibold" color="primary">
              Connect a Git provider to pick a private repo
            </PMText>
            <PMText fontSize="xs" color="secondary" lineHeight={1.5}>
              Packmind reads repo metadata to verify access. We don&rsquo;t
              touch your code, only the marketplace artifacts you publish.
            </PMText>
          </PMVStack>
        </PMHStack>
        <PMHStack gap={2} paddingTop={1}>
          {providers.map((p) => (
            <PMButton
              key={p.id}
              variant="secondary"
              size="sm"
              onClick={() => undefined}
            >
              <PMIcon fontSize="sm">{p.icon}</PMIcon>
              {p.label}
            </PMButton>
          ))}
        </PMHStack>
      </PMVStack>
    </PMBox>
  );
}

// ── Connected provider row ───────────────────────────────────────────────────

function ConnectedProviderRow({
  provider,
}: Readonly<{ provider: GitProvider | null }>) {
  if (!provider) return null;

  const ProviderIcon =
    provider === 'github'
      ? SiGithub
      : provider === 'gitlab'
        ? SiGitlab
        : SiBitbucket;

  return (
    <PMHStack
      gap={2}
      paddingX={3}
      paddingY={2}
      bg="background.secondary"
      borderRadius="sm"
      borderWidth="1px"
      borderColor="border.tertiary"
    >
      <PMIcon fontSize="sm" color="text.secondary">
        <ProviderIcon />
      </PMIcon>
      <PMText fontSize="xs" color="secondary" flex={1}>
        Connected to {GIT_PROVIDER_LABEL[provider]} as{' '}
        <PMText as="span" fontWeight="medium" color="primary">
          acme-eng
        </PMText>
      </PMText>
      <PMBox
        as="button"
        type="button"
        fontSize="xs"
        color="faded"
        bg="transparent"
        border="none"
        cursor="pointer"
        _hover={{ color: 'text.secondary' }}
        onClick={() => undefined}
      >
        Switch
      </PMBox>
    </PMHStack>
  );
}

// ── Repo picker ──────────────────────────────────────────────────────────────

type RepoPickerMenuProps = {
  repos: ConnectedRepo[];
  selectedRepo: ConnectedRepo | null;
  onSelect: (id: string) => void;
};

function RepoPickerMenu({
  repos,
  selectedRepo,
  onSelect,
}: Readonly<RepoPickerMenuProps>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
    setQuery('');
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDocPointerDown = (e: PointerEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDocPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDocPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter((r) => r.path.toLowerCase().includes(q));
  }, [query, repos]);

  return (
    <PMBox position="relative" ref={containerRef}>
      <PMBox
        as="button"
        type="button"
        width="100%"
        textAlign="left"
        paddingX={3}
        paddingY={2}
        bg="background.primary"
        borderWidth="1px"
        borderColor={
          open
            ? 'branding.primary'
            : selectedRepo
              ? 'border.secondary'
              : 'border.tertiary'
        }
        borderRadius="md"
        cursor="pointer"
        transition="border-color 150ms ease-out, background-color 150ms ease-out"
        _hover={open ? undefined : { borderColor: 'border.secondary' }}
        _focusVisible={{
          outline: '2px solid',
          outlineColor: 'branding.primary',
          outlineOffset: '1px',
        }}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <PMHStack gap={2} align="center">
          {selectedRepo ? (
            <SelectedRepoTrigger repo={selectedRepo} />
          ) : (
            <PMText fontSize="sm" color="faded" flex={1}>
              Choose a repository
            </PMText>
          )}
          <PMBox
            color="faded"
            transform={open ? 'rotate(180deg)' : 'rotate(0deg)'}
            transition="transform 150ms ease-out"
            display="inline-flex"
          >
            <PMIcon fontSize="sm">
              <LuChevronDown />
            </PMIcon>
          </PMBox>
        </PMHStack>
      </PMBox>

      {open && (
        <PMBox
          position="absolute"
          top="calc(100% + 4px)"
          left={0}
          right={0}
          zIndex={20}
          bg="background.primary"
          borderWidth="1px"
          borderColor="border.tertiary"
          borderRadius="md"
          boxShadow="0 12px 32px rgba(0,0,0,0.45)"
          overflow="hidden"
          role="listbox"
        >
          <PMBox
            padding={2}
            borderBottomWidth="1px"
            borderColor="border.tertiary"
          >
            <PMBox position="relative">
              <PMBox
                position="absolute"
                left="10px"
                top="50%"
                transform="translateY(-50%)"
                color="faded"
                pointerEvents="none"
                display="flex"
                alignItems="center"
              >
                <PMIcon fontSize="xs">
                  <LuSearch />
                </PMIcon>
              </PMBox>
              <PMInput
                ref={inputRef}
                placeholder="Search your repos…"
                value={query}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setQuery(e.target.value)
                }
                size="sm"
                paddingLeft="30px"
              />
            </PMBox>
          </PMBox>
          <PMBox maxHeight="220px" overflowY="auto" paddingY={1}>
            {filtered.length === 0 ? (
              <PMBox paddingX={3} paddingY={4} textAlign="center">
                <PMText fontSize="xs" color="faded">
                  No repos match &ldquo;{query}&rdquo;
                </PMText>
              </PMBox>
            ) : (
              filtered.map((r) => (
                <RepoOption
                  key={r.id}
                  repo={r}
                  selected={selectedRepo?.id === r.id}
                  onSelect={() => {
                    if (!r.alreadyLinked) {
                      onSelect(r.id);
                      setOpen(false);
                    }
                  }}
                />
              ))
            )}
          </PMBox>
        </PMBox>
      )}
    </PMBox>
  );
}

function SelectedRepoTrigger({ repo }: Readonly<{ repo: ConnectedRepo }>) {
  return (
    <PMHStack gap={2} flex={1} minW={0} align="center">
      <PMIcon fontSize="sm" color="text.secondary">
        <LuGitBranch />
      </PMIcon>
      <PMVStack gap={0} align="start" flex={1} minW={0}>
        <PMText fontSize="sm" color="primary" fontFamily="mono" truncate>
          {repo.path}
        </PMText>
        <PMHStack gap={1.5} align="center">
          <VisibilityChip visibility={repo.visibility} />
          <PMText fontSize="10px" color="faded">
            updated {repo.pushedRelative}
          </PMText>
        </PMHStack>
      </PMVStack>
    </PMHStack>
  );
}

type RepoOptionProps = {
  repo: ConnectedRepo;
  selected: boolean;
  onSelect: () => void;
};

function RepoOption({ repo, selected, onSelect }: Readonly<RepoOptionProps>) {
  const disabled = !!repo.alreadyLinked;

  return (
    <PMBox
      as="button"
      type="button"
      width="100%"
      textAlign="left"
      onClick={() => {
        if (!disabled) onSelect();
      }}
      disabled={disabled}
      paddingX={3}
      paddingY={2}
      bg="transparent"
      border="none"
      cursor={disabled ? 'not-allowed' : 'pointer'}
      opacity={disabled ? 0.55 : 1}
      transition="background-color 120ms ease-out"
      _hover={disabled ? undefined : { bg: 'background.secondary' }}
      _focusVisible={{
        outline: '2px solid',
        outlineColor: 'branding.primary',
        outlineOffset: '-2px',
      }}
      role="option"
      aria-selected={selected}
    >
      <PMHStack gap={2} flex={1} align="center">
        <PMIcon
          fontSize="sm"
          color={disabled ? 'text.faded' : 'text.secondary'}
        >
          <LuGitBranch />
        </PMIcon>
        <PMVStack gap={0.5} align="start" flex={1} minW={0}>
          <PMText
            fontSize="sm"
            color={disabled ? 'faded' : 'primary'}
            fontFamily="mono"
            truncate
          >
            {repo.path}
          </PMText>
          <PMHStack gap={1.5} align="center">
            <VisibilityChip visibility={repo.visibility} />
            <PMText fontSize="10px" color="faded">
              updated {repo.pushedRelative}
            </PMText>
            {repo.alreadyLinked && (
              <PMBox
                as="span"
                fontSize="10px"
                color="orange.400"
                fontWeight="medium"
              >
                already linked
              </PMBox>
            )}
          </PMHStack>
        </PMVStack>
        {selected && (
          <PMIcon fontSize="sm" color="branding.primary">
            <LuCheck />
          </PMIcon>
        )}
      </PMHStack>
    </PMBox>
  );
}

function VisibilityChip({
  visibility,
}: Readonly<{ visibility: ConnectedRepo['visibility'] }>) {
  const label =
    visibility === 'private'
      ? 'private'
      : visibility === 'internal'
        ? 'internal'
        : 'public';

  return (
    <PMHStack
      gap={1}
      paddingX={1.5}
      paddingY={0}
      bg="background.tertiary"
      borderRadius="sm"
      align="center"
    >
      <PMIcon fontSize="9px" color="faded">
        <LuLock />
      </PMIcon>
      <PMText fontSize="10px" color="secondary" fontWeight="medium">
        {label}
      </PMText>
    </PMHStack>
  );
}
