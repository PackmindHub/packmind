import { useEffect, useState, type MouseEvent } from 'react';
import {
  PMBox,
  PMHStack,
  PMIcon,
  PMMenu,
  PMPortal,
  PMText,
  PMTooltip,
  PMVStack,
} from '@packmind/ui';
import {
  LuEllipsis,
  LuExternalLink,
  LuLink,
  LuRotateCw,
  LuTerminal,
  LuTriangleAlert,
} from 'react-icons/lu';
import { SiClaude, SiGithubcopilot } from 'react-icons/si';
import type { IconType } from 'react-icons';
import {
  AGENT_LABEL,
  type Agent,
  type CoverageView,
  type Marketplace,
  type MarketplaceState,
} from '../types';

const AGENT_ICON: Record<Agent, IconType> = {
  'Claude Code': SiClaude,
  Copilot: SiGithubcopilot,
};

type MarketplaceRowProps = {
  marketplace: Marketplace;
  coverageView: CoverageView;
};

export function MarketplaceRow({
  marketplace,
  coverageView,
}: Readonly<MarketplaceRowProps>) {
  const {
    name,
    repoPath,
    remoteUrl,
    packageCount,
    agents,
    lastPublishedRelative,
    state,
    consumers,
  } = marketplace;

  const isUnreachable = state === 'unreachable';
  const baseTextColor = isUnreachable ? 'faded' : 'primary';

  return (
    <PMHStack
      gap={5}
      paddingX={4}
      paddingY={3}
      borderBottom="1px solid"
      borderColor="border.tertiary"
      align="center"
      cursor="pointer"
      transition="background-color 150ms ease-out"
      _hover={{ bg: 'background.secondary' }}
    >
      <PMVStack flex={1} minW={0} gap={1} align="start">
        <PMHStack gap={2} align="center">
          <PMText fontSize="sm" fontWeight="semibold" color={baseTextColor}>
            {name}
          </PMText>
          <StateInline state={state} />
        </PMHStack>
        <RepoPathMenu repoPath={repoPath} remoteUrl={remoteUrl} />
      </PMVStack>

      <PMVStack width="280px" flexShrink={0} gap={1} align="start" minW={0}>
        <PMHStack gap={2} align="center">
          <PMText fontSize="xs" fontWeight="medium" color={baseTextColor}>
            {packageCount} packages
          </PMText>
          <PMText fontSize="xs" color="faded">
            &middot;
          </PMText>
          <AgentBadges agents={agents} dimmed={isUnreachable} />
        </PMHStack>
        <PMText fontSize="xs" color="faded">
          last update {lastPublishedRelative}
        </PMText>
      </PMVStack>

      <PMBox width="180px" flexShrink={0}>
        <CoverageStrip
          consumers={consumers}
          state={state}
          view={coverageView}
        />
      </PMBox>

      <PMHStack gap={0} flexShrink={0} width="64px" justify="end">
        {isUnreachable && <ReconnectButton />}
        <MoreButton name={name} />
      </PMHStack>
    </PMHStack>
  );
}

type RepoPathMenuProps = {
  repoPath: string;
  remoteUrl: string;
};

function RepoPathMenu({ repoPath, remoteUrl }: Readonly<RepoPathMenuProps>) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const httpsUrl = sshToHttps(remoteUrl);
  const browserUrl = httpsUrl.replace(/\.git$/, '');

  useEffect(() => {
    if (!feedback) return;
    const id = setTimeout(() => setFeedback(null), 1500);
    return () => clearTimeout(id);
  }, [feedback]);

  const copy = (value: string, label: string) => {
    void navigator.clipboard?.writeText(value);
    setFeedback(label);
  };

  return (
    <PMMenu.Root positioning={{ placement: 'bottom-start' }}>
      <PMMenu.Trigger asChild>
        <PMBox
          as="button"
          type="button"
          bg="transparent"
          border="none"
          padding={0}
          textAlign="left"
          cursor="pointer"
          fontSize="xs"
          color={feedback ? 'green.500' : 'text.faded'}
          fontFamily="mono"
          transition="color 150ms ease-out"
          _hover={{ color: feedback ? 'green.500' : 'text.secondary' }}
          _focusVisible={{
            outline: '2px solid',
            outlineColor: 'branding.primary',
            outlineOffset: '2px',
            borderRadius: 'sm',
          }}
          onClick={(e: MouseEvent) => e.stopPropagation()}
          aria-label={`Repository actions for ${repoPath}`}
        >
          {feedback ? `${feedback} copied` : repoPath}
        </PMBox>
      </PMMenu.Trigger>
      <PMPortal>
        <PMMenu.Positioner>
          <PMMenu.Content minWidth="260px">
            <PMMenu.Item
              value="copy-ssh"
              cursor="pointer"
              onClick={() => copy(remoteUrl, 'SSH URL')}
            >
              <PMHStack gap={2} flex={1} align="center">
                <PMIcon fontSize="sm" color="text.faded">
                  <LuTerminal />
                </PMIcon>
                <PMVStack gap={0} align="start" flex={1} minW={0}>
                  <PMText fontSize="xs" color="primary">
                    Copy SSH URL
                  </PMText>
                  <PMText
                    fontSize="10px"
                    color="faded"
                    fontFamily="mono"
                    truncate
                  >
                    {remoteUrl}
                  </PMText>
                </PMVStack>
              </PMHStack>
            </PMMenu.Item>
            <PMMenu.Item
              value="copy-https"
              cursor="pointer"
              onClick={() => copy(httpsUrl, 'HTTPS URL')}
            >
              <PMHStack gap={2} flex={1} align="center">
                <PMIcon fontSize="sm" color="text.faded">
                  <LuLink />
                </PMIcon>
                <PMVStack gap={0} align="start" flex={1} minW={0}>
                  <PMText fontSize="xs" color="primary">
                    Copy HTTPS URL
                  </PMText>
                  <PMText
                    fontSize="10px"
                    color="faded"
                    fontFamily="mono"
                    truncate
                  >
                    {httpsUrl}
                  </PMText>
                </PMVStack>
              </PMHStack>
            </PMMenu.Item>
            <PMMenu.Item
              value="open-browser"
              cursor="pointer"
              onClick={() => window.open(browserUrl, '_blank', 'noopener')}
            >
              <PMHStack gap={2} flex={1} align="center">
                <PMIcon fontSize="sm" color="text.faded">
                  <LuExternalLink />
                </PMIcon>
                <PMText fontSize="xs" color="primary">
                  Open on GitHub
                </PMText>
              </PMHStack>
            </PMMenu.Item>
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
}

function sshToHttps(ssh: string): string {
  const match = ssh.match(/^git@([^:]+):(.+)$/);
  if (!match) return ssh;
  return `https://${match[1]}/${match[2]}`;
}

type AgentBadgesProps = {
  agents: Agent[];
  dimmed: boolean;
};

function AgentBadges({ agents, dimmed }: Readonly<AgentBadgesProps>) {
  return (
    <PMHStack gap={1}>
      {agents.map((a) => {
        const Icon = AGENT_ICON[a];
        return (
          <PMTooltip key={a} label={AGENT_LABEL[a]} showArrow openDelay={200}>
            <PMBox
              display="inline-flex"
              alignItems="center"
              justifyContent="center"
              bg="background.tertiary"
              color={dimmed ? 'text.faded' : 'text.secondary'}
              width="20px"
              height="18px"
              borderRadius="sm"
              aria-label={AGENT_LABEL[a]}
            >
              <PMIcon fontSize="11px">
                <Icon />
              </PMIcon>
            </PMBox>
          </PMTooltip>
        );
      })}
    </PMHStack>
  );
}

function StateInline({ state }: Readonly<{ state: MarketplaceState }>) {
  if (state === 'unreachable') {
    return (
      <PMHStack gap={1.5} align="center">
        <PMBox
          width="6px"
          height="6px"
          borderRadius="full"
          bg="red.500"
          aria-hidden
        />
        <PMText fontSize="xs" fontWeight="medium" color="red.500">
          repo unreachable
        </PMText>
      </PMHStack>
    );
  }
  return null;
}

type CoverageStripProps = {
  consumers: Marketplace['consumers'];
  state: MarketplaceState;
  view: CoverageView;
};

function CoverageStrip({
  consumers,
  state,
  view,
}: Readonly<CoverageStripProps>) {
  const { repoCount, devCount, outdatedRepos, outdatedDevs } = consumers;
  const headlineCount = view === 'repos' ? repoCount : devCount;
  const headlineLabel = view === 'repos' ? 'repos' : 'devs';
  const outdatedCount = view === 'repos' ? outdatedRepos : outdatedDevs;
  const outdatedTooltip =
    view === 'repos'
      ? 'Consuming repos with at least one plugin behind the latest published version'
      : 'Developers with at least one plugin behind the latest published version';

  if (state === 'unreachable') {
    return (
      <PMVStack gap={0.5} align="end">
        <PMText fontSize="sm" color="faded" fontVariantNumeric="tabular-nums">
          {headlineCount} {headlineLabel}
        </PMText>
        <PMText fontSize="xs" color="faded">
          coverage unavailable
        </PMText>
      </PMVStack>
    );
  }

  return (
    <PMVStack gap={1} align="end">
      <PMText
        fontSize="sm"
        fontWeight="semibold"
        color="primary"
        fontVariantNumeric="tabular-nums"
      >
        {headlineCount}{' '}
        <PMText as="span" fontSize="xs" fontWeight="normal" color="faded">
          {headlineLabel}
        </PMText>
      </PMText>
      {state === 'drift' && outdatedCount > 0 && (
        <PMTooltip label={outdatedTooltip} showArrow openDelay={200}>
          <PMHStack gap={1.5} align="center" cursor="help">
            <PMIcon fontSize="11px" color="orange.500">
              <LuTriangleAlert />
            </PMIcon>
            <PMText
              fontSize="xs"
              color="orange.500"
              fontVariantNumeric="tabular-nums"
              fontWeight="medium"
            >
              {outdatedCount} outdated
            </PMText>
          </PMHStack>
        </PMTooltip>
      )}
    </PMVStack>
  );
}

function ReconnectButton() {
  return (
    <PMTooltip label="Reconnect repository" showArrow openDelay={200}>
      <PMBox
        as="button"
        type="button"
        width="32px"
        height="32px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="transparent"
        border="none"
        borderRadius="sm"
        color="branding.primary"
        cursor="pointer"
        aria-label="Reconnect repository"
        _hover={{ color: 'blue.300', bg: 'background.tertiary' }}
        _focusVisible={{
          outline: '2px solid',
          outlineColor: 'branding.primary',
          outlineOffset: '1px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <PMIcon fontSize="sm">
          <LuRotateCw />
        </PMIcon>
      </PMBox>
    </PMTooltip>
  );
}

function MoreButton({ name }: Readonly<{ name: string }>) {
  return (
    <PMBox
      as="button"
      type="button"
      width="32px"
      height="32px"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="transparent"
      border="none"
      borderRadius="sm"
      color="text.faded"
      cursor="pointer"
      aria-label={`More actions for ${name}`}
      _hover={{ color: 'text.primary', bg: 'background.tertiary' }}
      _focusVisible={{
        outline: '2px solid',
        outlineColor: 'branding.primary',
        outlineOffset: '1px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <PMIcon fontSize="sm">
        <LuEllipsis />
      </PMIcon>
    </PMBox>
  );
}
