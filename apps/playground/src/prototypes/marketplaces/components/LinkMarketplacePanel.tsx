import { useEffect, useMemo, useState } from 'react';
import {
  PMBox,
  PMButton,
  PMCloseButton,
  PMDrawer,
  PMHStack,
  PMIcon,
  PMPortal,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuCopy, LuExternalLink, LuTerminal } from 'react-icons/lu';
import type {
  Agent,
  ConnectedRepo,
  GitProvider,
  LinkScenario,
  Marketplace,
  PublicValidation,
  SubmitState,
  Visibility,
} from '../types';
import { STUB_CONNECTED_PROVIDER, STUB_CONNECTED_REPOS } from '../data';
import { PrivateLinkForm } from './PrivateLinkForm';
import { PublicLinkForm } from './PublicLinkForm';

type LinkMarketplacePanelProps = {
  open: boolean;
  onClose: () => void;
  scenario: LinkScenario;
  existingNames: string[];
  existingRepoPaths: string[];
  onLinked: (m: Marketplace) => void;
};

type DraftState = {
  visibility: Visibility;
  // Private path
  selectedRepoId: string | null;
  // Public path
  publicUrl: string;
  publicValidation: PublicValidation;
  // Shared
  name: string;
  nameTouched: boolean;
  agents: Agent[];
  submit: SubmitState;
};

const DEFAULT_AGENTS: Agent[] = ['Claude Code', 'Copilot'];

function initialDraft(): DraftState {
  return {
    visibility: 'private',
    selectedRepoId: null,
    publicUrl: '',
    publicValidation: { kind: 'idle' },
    name: '',
    nameTouched: false,
    agents: DEFAULT_AGENTS,
    submit: { kind: 'idle' },
  };
}

function suggestName(repoPath: string): string {
  const slug = repoPath.split('/').pop() ?? repoPath;
  const cleaned = slug
    .replace(/[-_]marketplace$/i, '')
    .replace(/[-_]/g, ' ')
    .trim();
  if (!cleaned) return repoPath;
  return cleaned
    .split(' ')
    .map((w, i) => (i === 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function parseRemoteUrl(input: string): {
  repoPath: string;
  remoteUrl: string;
} | null {
  const trimmed = input.trim();
  const ssh = trimmed.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
  if (ssh) {
    return {
      repoPath: ssh[2],
      remoteUrl: `git@${ssh[1]}:${ssh[2]}.git`,
    };
  }
  const https = trimmed.match(/^https?:\/\/([^/]+)\/(.+?)(?:\.git)?$/);
  if (https) {
    return {
      repoPath: https[2],
      remoteUrl: `git@${https[1]}:${https[2]}.git`,
    };
  }
  return null;
}

export function LinkMarketplacePanel({
  open,
  onClose,
  scenario,
  existingNames,
  existingRepoPaths,
  onLinked,
}: Readonly<LinkMarketplacePanelProps>) {
  const [draft, setDraft] = useState<DraftState>(initialDraft);

  useEffect(() => {
    if (open) setDraft(initialDraft());
  }, [open]);

  const gitConnected = scenario !== 'git-not-connected';
  const provider: GitProvider | null = gitConnected
    ? STUB_CONNECTED_PROVIDER
    : null;

  const selectedRepo = useMemo<ConnectedRepo | null>(() => {
    if (!draft.selectedRepoId) return null;
    return (
      STUB_CONNECTED_REPOS.find((r) => r.id === draft.selectedRepoId) ?? null
    );
  }, [draft.selectedRepoId]);

  const handleVisibilityChange = (v: Visibility) => {
    setDraft((d) => ({ ...d, visibility: v, submit: { kind: 'idle' } }));
  };

  const handleSelectRepo = (repoId: string) => {
    const repo = STUB_CONNECTED_REPOS.find((r) => r.id === repoId) ?? null;
    setDraft((d) => ({
      ...d,
      selectedRepoId: repoId,
      name: d.nameTouched ? d.name : repo ? suggestName(repo.path) : d.name,
      submit: { kind: 'idle' },
    }));
  };

  const handlePublicUrlChange = (value: string) => {
    setDraft((d) => ({
      ...d,
      publicUrl: value,
      publicValidation: { kind: 'idle' },
      submit: { kind: 'idle' },
    }));
  };

  const handlePublicUrlValidate = () => {
    if (!draft.publicUrl.trim()) {
      setDraft((d) => ({ ...d, publicValidation: { kind: 'idle' } }));
      return;
    }
    setDraft((d) => ({ ...d, publicValidation: { kind: 'checking' } }));

    setTimeout(() => {
      setDraft((d) => {
        const parsed = parseRemoteUrl(d.publicUrl);
        if (!parsed) {
          return {
            ...d,
            publicValidation: { kind: 'error', reason: 'malformed' },
          };
        }
        const lowered = parsed.repoPath.toLowerCase();
        if (lowered.includes('private') || lowered.endsWith('-internal')) {
          return {
            ...d,
            publicValidation: { kind: 'error', reason: 'not-public' },
          };
        }
        if (lowered.includes('not-found') || lowered.includes('missing')) {
          return {
            ...d,
            publicValidation: { kind: 'error', reason: 'not-found' },
          };
        }
        return {
          ...d,
          publicValidation: {
            kind: 'verified',
            repoPath: parsed.repoPath,
            visibilityHint: 'public',
            defaultBranch: 'main',
          },
          name: d.nameTouched ? d.name : suggestName(parsed.repoPath),
        };
      });
    }, 650);
  };

  const handleNameChange = (value: string) => {
    setDraft((d) => ({
      ...d,
      name: value,
      nameTouched: true,
      submit: { kind: 'idle' },
    }));
  };

  const handleAgentToggle = (agent: Agent, checked: boolean) => {
    setDraft((d) => ({
      ...d,
      agents: checked
        ? Array.from(new Set([...d.agents, agent]))
        : d.agents.filter((a) => a !== agent),
    }));
  };

  const buildMarketplace = (): Marketplace | null => {
    const trimmedName = draft.name.trim();
    if (!trimmedName) return null;
    if (draft.agents.length === 0) return null;

    if (draft.visibility === 'private') {
      if (!selectedRepo) return null;
      return {
        id: `m-${Date.now()}`,
        name: trimmedName,
        repoPath: selectedRepo.path,
        remoteUrl: `git@github.com:${selectedRepo.path}.git`,
        packageCount: 0,
        agents: draft.agents,
        lastPublishedRelative: 'just linked',
        state: 'healthy',
        consumers: {
          repoCount: 0,
          devCount: 0,
          outdatedRepos: 0,
          outdatedDevs: 0,
        },
      };
    }

    if (draft.publicValidation.kind !== 'verified') return null;
    const repoPath = draft.publicValidation.repoPath;
    return {
      id: `m-${Date.now()}`,
      name: trimmedName,
      repoPath,
      remoteUrl: `git@github.com:${repoPath}.git`,
      packageCount: 0,
      agents: draft.agents,
      lastPublishedRelative: 'just linked',
      state: 'healthy',
      consumers: {
        repoCount: 0,
        devCount: 0,
        outdatedRepos: 0,
        outdatedDevs: 0,
      },
    };
  };

  const candidate = useMemo(buildMarketplace, [draft, selectedRepo]);

  const canSubmit = candidate !== null && draft.submit.kind !== 'submitting';

  const handleSubmit = () => {
    if (!candidate) return;

    const nameLower = candidate.name.toLowerCase();
    const repoLower = candidate.repoPath.toLowerCase();
    const nameTaken = existingNames.some((n) => n.toLowerCase() === nameLower);
    const repoTaken =
      existingRepoPaths.some((p) => p.toLowerCase() === repoLower) ||
      (draft.visibility === 'private' && selectedRepo?.alreadyLinked === true);

    setDraft((d) => ({ ...d, submit: { kind: 'submitting' } }));

    setTimeout(() => {
      if (scenario === 'collision-on-submit') {
        setDraft((d) => ({
          ...d,
          submit: { kind: 'error', reason: 'name-collision' },
        }));
        return;
      }
      if (nameTaken) {
        setDraft((d) => ({
          ...d,
          submit: { kind: 'error', reason: 'name-collision' },
        }));
        return;
      }
      if (repoTaken) {
        setDraft((d) => ({
          ...d,
          submit: { kind: 'error', reason: 'repo-already-linked' },
        }));
        return;
      }
      onLinked(candidate);
    }, 850);
  };

  return (
    <PMDrawer.Root
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      placement="end"
      size="md"
    >
      <PMPortal>
        <PMDrawer.Backdrop />
        <PMDrawer.Positioner>
          <PMDrawer.Content
            bg="background.primary"
            display="flex"
            flexDirection="column"
            h="100dvh"
            overflow="hidden"
          >
            <PMBox flexShrink={0}>
              <PanelHeader />

              <VisibilityTabs
                value={draft.visibility}
                onChange={handleVisibilityChange}
              />

              <SubmittingBar visible={draft.submit.kind === 'submitting'} />
            </PMBox>

            <PMDrawer.Body padding={0} flex="1 1 0" minH={0} overflowY="auto">
              <PMVStack gap={0} align="stretch" paddingX={5} paddingY={5}>
                {draft.submit.kind === 'error' && (
                  <SubmitErrorBanner
                    reason={draft.submit.reason}
                    name={draft.name.trim()}
                  />
                )}

                {draft.visibility === 'private' ? (
                  <PrivateLinkForm
                    gitConnected={gitConnected}
                    provider={provider}
                    repos={STUB_CONNECTED_REPOS}
                    selectedRepoId={draft.selectedRepoId}
                    onSelectRepo={handleSelectRepo}
                    name={draft.name}
                    onNameChange={handleNameChange}
                    agents={draft.agents}
                    onAgentToggle={handleAgentToggle}
                  />
                ) : (
                  <PublicLinkForm
                    url={draft.publicUrl}
                    onUrlChange={handlePublicUrlChange}
                    onUrlValidate={handlePublicUrlValidate}
                    validation={draft.publicValidation}
                    name={draft.name}
                    onNameChange={handleNameChange}
                    agents={draft.agents}
                    onAgentToggle={handleAgentToggle}
                  />
                )}
              </PMVStack>
            </PMDrawer.Body>

            <PMBox flexShrink={0}>
              <CliFallbackBlock />

              <PanelActions
                onCancel={onClose}
                onSubmit={handleSubmit}
                canSubmit={canSubmit}
                submitting={draft.submit.kind === 'submitting'}
              />
            </PMBox>

            <PMDrawer.CloseTrigger asChild>
              <PMCloseButton size="sm" />
            </PMDrawer.CloseTrigger>
          </PMDrawer.Content>
        </PMDrawer.Positioner>
      </PMPortal>
    </PMDrawer.Root>
  );
}

function PanelHeader() {
  return (
    <PMDrawer.Header
      paddingX={5}
      paddingTop={4}
      paddingBottom={3}
      borderBottomWidth="1px"
      borderColor="border.tertiary"
    >
      <PMVStack gap={1} align="start" flex={1}>
        <PMDrawer.Title fontSize="md" fontWeight="semibold" color="primary">
          Link a marketplace
        </PMDrawer.Title>
        <PMText fontSize="xs" color="secondary" lineHeight={1.5}>
          Point Packmind at a Git repo your team owns. We&rsquo;ll publish
          packages there for agents to read.
        </PMText>
      </PMVStack>
    </PMDrawer.Header>
  );
}

type VisibilityTabsProps = {
  value: Visibility;
  onChange: (v: Visibility) => void;
};

function VisibilityTabs({ value, onChange }: Readonly<VisibilityTabsProps>) {
  const tabs: Array<{ id: Visibility; label: string; helper: string }> = [
    {
      id: 'private',
      label: 'Private',
      helper: 'Requires a connected Git provider.',
    },
    {
      id: 'public',
      label: 'Public',
      helper: 'Anyone can clone the repo, so a URL is enough.',
    },
  ];

  const active = tabs.find((t) => t.id === value) ?? tabs[0];

  return (
    <PMBox
      paddingX={5}
      paddingTop={3}
      borderBottomWidth="1px"
      borderColor="border.tertiary"
      bg="background.primary"
    >
      <PMHStack gap={0} align="end" justify="space-between">
        <PMHStack gap={0}>
          {tabs.map((t) => {
            const isActive = t.id === value;
            return (
              <PMBox
                key={t.id}
                as="button"
                type="button"
                onClick={() => onChange(t.id)}
                paddingX={3}
                paddingBottom={2}
                fontSize="sm"
                fontWeight={isActive ? 'semibold' : 'medium'}
                color={isActive ? 'text.primary' : 'text.faded'}
                bg="transparent"
                border="none"
                borderBottomWidth="2px"
                borderColor={isActive ? 'branding.primary' : 'transparent'}
                marginBottom="-1px"
                cursor="pointer"
                transition="color 150ms ease-out, border-color 150ms ease-out"
                _hover={isActive ? undefined : { color: 'text.secondary' }}
                _focusVisible={{
                  outline: '2px solid',
                  outlineColor: 'branding.primary',
                  outlineOffset: '2px',
                }}
                aria-selected={isActive}
                role="tab"
              >
                {t.label}
              </PMBox>
            );
          })}
        </PMHStack>
        <PMText fontSize="11px" color="faded" paddingBottom={2}>
          {active.helper}
        </PMText>
      </PMHStack>
    </PMBox>
  );
}

function SubmittingBar({ visible }: Readonly<{ visible: boolean }>) {
  return (
    <PMBox
      height="2px"
      width="100%"
      bg={visible ? 'branding.primary' : 'transparent'}
      opacity={visible ? 1 : 0}
      transition="opacity 150ms ease-out"
      aria-hidden
    />
  );
}

type SubmitErrorBannerProps = {
  reason: 'name-collision' | 'repo-already-linked' | 'network';
  name: string;
};

function SubmitErrorBanner({ reason, name }: Readonly<SubmitErrorBannerProps>) {
  const message =
    reason === 'name-collision'
      ? `A marketplace named "${name}" already exists. Try another name.`
      : reason === 'repo-already-linked'
        ? 'This repo is already linked as a marketplace.'
        : "We couldn't reach Packmind to finish linking. Check your connection and try again.";

  return (
    <PMBox
      bg="red.900"
      borderWidth="1px"
      borderColor="red.500"
      borderRadius="md"
      paddingX={3}
      paddingY={2.5}
      marginBottom={4}
      role="alert"
    >
      <PMBox as="span" fontSize="xs" color="red.200" lineHeight={1.5}>
        {message}
      </PMBox>
    </PMBox>
  );
}

function CliFallbackBlock() {
  const command = 'packmind-cli marketplaces register';
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(id);
  }, [copied]);

  const handleCopy = () => {
    void navigator.clipboard?.writeText(command);
    setCopied(true);
  };

  return (
    <PMBox
      paddingX={5}
      paddingY={2.5}
      borderTopWidth="1px"
      borderColor="border.tertiary"
      bg="background.secondary"
    >
      <PMHStack
        gap={2}
        padding={1.5}
        paddingLeft={2.5}
        bg="background.tertiary"
        borderRadius="sm"
        align="center"
        transition="background-color 150ms ease-out"
      >
        <PMIcon fontSize="xs" color="text.faded">
          <LuTerminal />
        </PMIcon>
        <PMBox
          flex={1}
          minW={0}
          fontFamily="mono"
          fontSize="11px"
          color="primary"
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
        >
          {command}
        </PMBox>
        <PMBox
          as="button"
          type="button"
          onClick={handleCopy}
          display="inline-flex"
          alignItems="center"
          gap={1}
          paddingX={1.5}
          paddingY={0.5}
          bg="transparent"
          border="none"
          borderRadius="sm"
          color={copied ? 'green.400' : 'text.secondary'}
          fontSize="11px"
          fontWeight="medium"
          cursor="pointer"
          transition="color 150ms ease-out"
          _hover={{ color: copied ? 'green.400' : 'text.primary' }}
          aria-label="Copy CLI command"
        >
          <PMIcon fontSize="11px">
            <LuCopy />
          </PMIcon>
          {copied ? 'Copied' : 'Copy'}
        </PMBox>
        <PMBox
          as="a"
          href="#"
          onClick={(e: React.MouseEvent) => e.preventDefault()}
          display="inline-flex"
          alignItems="center"
          gap={0.5}
          paddingX={1.5}
          paddingY={0.5}
          color="branding.primary"
          fontSize="11px"
          fontWeight="medium"
          cursor="pointer"
          borderRadius="sm"
          _hover={{ color: 'blue.300' }}
          aria-label="Open CLI docs"
        >
          Docs
          <PMIcon fontSize="11px">
            <LuExternalLink />
          </PMIcon>
        </PMBox>
      </PMHStack>
      <PMText fontSize="11px" color="faded" lineHeight={1.4} paddingTop={1.5}>
        Run it inside the repo you want to link. Uses your local Git
        credentials, so it works for self-hosted and CI too.
      </PMText>
    </PMBox>
  );
}

type PanelActionsProps = {
  onCancel: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
  submitting: boolean;
};

function PanelActions({
  onCancel,
  onSubmit,
  canSubmit,
  submitting,
}: Readonly<PanelActionsProps>) {
  return (
    <PMBox
      paddingX={5}
      paddingY={4}
      borderTopWidth="1px"
      borderColor="border.tertiary"
      bg="background.primary"
    >
      <PMHStack gap={2} justify="end">
        <PMButton variant="tertiary" size="sm" onClick={onCancel}>
          Cancel
        </PMButton>
        <PMButton
          variant="primary"
          size="sm"
          onClick={onSubmit}
          disabled={!canSubmit}
        >
          {submitting ? 'Linking…' : 'Link marketplace'}
        </PMButton>
      </PMHStack>
    </PMBox>
  );
}
