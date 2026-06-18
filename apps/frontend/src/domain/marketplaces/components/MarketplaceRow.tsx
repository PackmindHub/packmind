import { useEffect, useState, type MouseEvent } from 'react';
import { Link } from 'react-router';
import {
  PMBox,
  PMConfirmationModal,
  PMHStack,
  PMIcon,
  PMLink,
  PMMenu,
  PMPortal,
  PMSpinner,
  PMText,
  PMTooltip,
  PMVStack,
} from '@packmind/ui';
import {
  LuEllipsis,
  LuExternalLink,
  LuLink,
  LuTerminal,
  LuTrash2,
  LuTriangleAlert,
} from 'react-icons/lu';
import { SiClaude } from 'react-icons/si';
import type { IconType } from 'react-icons';
import type { MarketplaceId, MarketplaceListItem } from '@packmind/types';
import { MarketplaceStateDot } from './MarketplaceStateDot';

export interface MarketplaceRowProps {
  marketplace: MarketplaceListItem;
  onUnlink: (marketplaceId: MarketplaceId) => void;
  isUnlinking: boolean;
  /**
   * When true, the row's state cell shows an inline spinner indicating its
   * live state is being refreshed on page open.
   */
  isRefreshing?: boolean;
  /**
   * Organization slug used to build the link to the marketplace details
   * sub-route. When omitted, the marketplace name renders as plain text.
   */
  orgSlug?: string;
}

export const MarketplaceRow = ({
  marketplace,
  onUnlink,
  isUnlinking,
  isRefreshing = false,
  orgSlug,
}: Readonly<MarketplaceRowProps>) => {
  const detailsHref = orgSlug
    ? `/org/${orgSlug}/marketplaces/${marketplace.id}`
    : undefined;

  return (
    <PMHStack
      gap={5}
      paddingX={4}
      paddingY={3}
      borderBottom="1px solid"
      borderColor="border.tertiary"
      align="center"
      transition="background-color 150ms ease-out"
      _hover={{ bg: 'background.secondary' }}
      data-testid={`marketplace-row-${marketplace.id}`}
    >
      <PMVStack flex={1} minW={0} gap={1} align="start">
        <NameCell marketplace={marketplace} detailsHref={detailsHref} />
        <PMHStack gap={2} align="center" minW={0}>
          <RepositoryCell marketplace={marketplace} />
          <MarketplaceStateDot
            state={marketplace.state}
            errorKind={marketplace.errorKind}
            errorDetail={marketplace.errorDetail}
          />
          {isRefreshing && (
            <PMSpinner size="xs" aria-label="Checking marketplace" />
          )}
        </PMHStack>
      </PMVStack>

      <PMVStack width="280px" flexShrink={0} gap={1} align="start" minW={0}>
        <PMHStack gap={2} align="center">
          <PMText variant="small" fontWeight="medium">
            {marketplace.pluginCount} plugin
            {marketplace.pluginCount === 1 ? '' : 's'}
          </PMText>
          <PMText variant="small" color="faded">
            ·
          </PMText>
          <VendorBadge vendor={marketplace.vendor} />
        </PMHStack>
        <OutdatedIndicator marketplace={marketplace} />
      </PMVStack>

      <PMBox width="180px" flexShrink={0} textAlign="right">
        <PMText variant="small" color="faded">
          —
        </PMText>
      </PMBox>

      <PMHStack gap={0} flexShrink={0} width="64px" justify="end">
        <RowActionsMenu
          marketplace={marketplace}
          onUnlink={onUnlink}
          isUnlinking={isUnlinking}
        />
      </PMHStack>
    </PMHStack>
  );
};

const OutdatedIndicator = ({
  marketplace,
}: Readonly<{ marketplace: MarketplaceListItem }>) => {
  const driftCount = marketplace.descriptor?.driftedPluginSlugs?.length ?? 0;
  const outdatedCount = marketplace.outdatedPluginSlugs?.length ?? 0;
  const isDrift = marketplace.state === 'drift';

  if (!isDrift && outdatedCount === 0) {
    return null;
  }

  const count = Math.max(driftCount, outdatedCount);
  const tooltip =
    count > 0
      ? `${count} plugin${count === 1 ? '' : 's'} need to be published again.`
      : 'Some plugins need to be published again.';

  return (
    <PMTooltip label={tooltip} showArrow openDelay={200}>
      <PMHStack gap={1.5} align="center" cursor="help">
        <PMIcon fontSize="11px" color="orange.500">
          <LuTriangleAlert />
        </PMIcon>
        <PMText
          variant="small"
          color="warning"
          fontWeight="medium"
          fontVariantNumeric="tabular-nums"
        >
          {count > 0 ? `${count} outdated` : 'Outdated'}
        </PMText>
      </PMHStack>
    </PMTooltip>
  );
};

const NameCell = ({
  marketplace,
  detailsHref,
}: Readonly<{ marketplace: MarketplaceListItem; detailsHref?: string }>) => {
  if (detailsHref) {
    return (
      <PMLink asChild>
        <Link to={detailsHref}>
          <PMText variant="body-important">{marketplace.name}</PMText>
        </Link>
      </PMLink>
    );
  }
  return <PMText variant="body-important">{marketplace.name}</PMText>;
};

const RepositoryCell = ({
  marketplace,
}: Readonly<{ marketplace: MarketplaceListItem }>) => {
  const repository = marketplace.repository;
  if (!repository) {
    return (
      <PMText variant="small" color="faded">
        —
      </PMText>
    );
  }

  return (
    <RepositoryMenu
      ownerRepo={`${repository.owner}/${repository.repo}`}
      webUrl={repository.url}
      providerSource={repository.providerSource}
    />
  );
};

interface RepositoryMenuProps {
  ownerRepo: string;
  webUrl: string;
  providerSource: string;
}

const RepositoryMenu = ({
  ownerRepo,
  webUrl,
  providerSource,
}: Readonly<RepositoryMenuProps>) => {
  const [feedback, setFeedback] = useState<string | null>(null);

  const httpsUrl = normalizeHttps(webUrl);
  const sshUrl = deriveSshUrl(webUrl);
  const providerName = providerLabel(providerSource);

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
          aria-label={`Repository actions for ${ownerRepo}`}
        >
          {feedback ? `${feedback} copied` : ownerRepo}
        </PMBox>
      </PMMenu.Trigger>
      <PMPortal>
        <PMMenu.Positioner>
          <PMMenu.Content minWidth="260px">
            {sshUrl && (
              <PMMenu.Item
                value="copy-ssh"
                cursor="pointer"
                onClick={() => copy(sshUrl, 'SSH URL')}
              >
                <PMHStack gap={2} flex={1} align="center">
                  <PMIcon fontSize="sm" color="text.faded">
                    <LuTerminal />
                  </PMIcon>
                  <PMVStack gap={0} align="start" flex={1} minW={0}>
                    <PMText variant="small">Copy SSH URL</PMText>
                    <PMText
                      fontSize="10px"
                      color="faded"
                      fontFamily="mono"
                      truncate
                    >
                      {sshUrl}
                    </PMText>
                  </PMVStack>
                </PMHStack>
              </PMMenu.Item>
            )}
            {httpsUrl && (
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
                    <PMText variant="small">Copy HTTPS URL</PMText>
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
            )}
            {webUrl && (
              <PMMenu.Item
                value="open-browser"
                cursor="pointer"
                onClick={() =>
                  window.open(webUrl, '_blank', 'noopener,noreferrer')
                }
              >
                <PMHStack gap={2} flex={1} align="center">
                  <PMIcon fontSize="sm" color="text.faded">
                    <LuExternalLink />
                  </PMIcon>
                  <PMText variant="small">Open on {providerName}</PMText>
                </PMHStack>
              </PMMenu.Item>
            )}
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
};

const VENDOR_ICON: Record<string, IconType> = {
  anthropic: SiClaude,
};

const VendorBadge = ({ vendor }: Readonly<{ vendor: string }>) => {
  const Icon = VENDOR_ICON[vendor];
  const label = vendorLabel(vendor);

  if (!Icon) {
    return (
      <PMText variant="small" color="faded">
        {label}
      </PMText>
    );
  }

  return (
    <PMTooltip label={label} showArrow openDelay={200}>
      <PMBox
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        bg="background.tertiary"
        color="text.secondary"
        width="20px"
        height="18px"
        borderRadius="sm"
        aria-label={label}
      >
        <PMIcon fontSize="11px">
          <Icon />
        </PMIcon>
      </PMBox>
    </PMTooltip>
  );
};

interface RowActionsMenuProps {
  marketplace: MarketplaceListItem;
  onUnlink: (marketplaceId: MarketplaceId) => void;
  isUnlinking: boolean;
}

export const RowActionsMenu = ({
  marketplace,
  onUnlink,
  isUnlinking,
}: Readonly<RowActionsMenuProps>) => {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleConfirm = () => {
    onUnlink(marketplace.id);
    setConfirmOpen(false);
  };

  return (
    <>
      <PMMenu.Root positioning={{ placement: 'bottom-end' }}>
        <PMMenu.Trigger asChild>
          <PMBox
            as="button"
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
            aria-label={`Actions for ${marketplace.name}`}
            _hover={{ color: 'text.primary', bg: 'background.tertiary' }}
            _focusVisible={{
              outline: '2px solid',
              outlineColor: 'branding.primary',
              outlineOffset: '1px',
            }}
            onClick={(e: MouseEvent) => e.stopPropagation()}
          >
            <PMIcon fontSize="sm">
              <LuEllipsis />
            </PMIcon>
          </PMBox>
        </PMMenu.Trigger>
        <PMPortal>
          <PMMenu.Positioner>
            <PMMenu.Content minWidth="180px">
              <PMMenu.Item
                value="unlink"
                cursor="pointer"
                color="red.500"
                disabled={isUnlinking}
                onClick={() => setConfirmOpen(true)}
              >
                <PMHStack gap={2} flex={1} align="center">
                  <PMIcon fontSize="sm">
                    <LuTrash2 />
                  </PMIcon>
                  <PMText variant="small">Unlink marketplace</PMText>
                </PMHStack>
              </PMMenu.Item>
            </PMMenu.Content>
          </PMMenu.Positioner>
        </PMPortal>
      </PMMenu.Root>
      <PMConfirmationModal
        trigger={<span />}
        title="Unlink marketplace"
        message={`Unlink "${marketplace.name}" from this organization? The underlying Git repository will not be touched.`}
        confirmText="Unlink"
        confirmColorScheme="red"
        open={confirmOpen}
        onOpenChange={({ open }) => setConfirmOpen(open)}
        onConfirm={handleConfirm}
        isLoading={isUnlinking}
      />
    </>
  );
};

function vendorLabel(vendor: string): string {
  switch (vendor) {
    case 'anthropic':
      return 'Claude Code';
    default:
      return vendor;
  }
}

function providerLabel(source: string): string {
  switch (source) {
    case 'github':
      return 'GitHub';
    case 'gitlab':
      return 'GitLab';
    default:
      return 'provider';
  }
}

/**
 * Strips a trailing `.git` if present and re-adds it. Returns the canonical
 * HTTPS URL we suggest copying. Falls back to the raw URL when it does not
 * look like an HTTP(S) URL.
 */
function normalizeHttps(webUrl: string): string | null {
  if (!webUrl) return null;
  if (!/^https?:\/\//.test(webUrl)) return webUrl;
  return webUrl.replace(/\.git$/, '') + '.git';
}

/**
 * Best-effort conversion of the repository's web URL to its SSH clone URL.
 * Works for `https://github.com/owner/repo` and the equivalent GitLab /
 * Bitbucket URLs — i.e. the providers that surface SSH as `git@host:owner/repo.git`.
 * Returns `null` for non-HTTP(S) URLs (we already render those raw via the
 * HTTPS copy entry).
 */
function deriveSshUrl(webUrl: string): string | null {
  if (!webUrl) return null;
  const match = webUrl.match(/^https?:\/\/([^/]+)\/(.+?)(?:\.git)?\/?$/);
  if (!match) return null;
  return `git@${match[1]}:${match[2]}.git`;
}

export const __testables__ = {
  vendorLabel,
  providerLabel,
  normalizeHttps,
  deriveSshUrl,
};
