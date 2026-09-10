import { PMBadge, PMText, PMTooltip } from '@packmind/ui';
import {
  AGENT_LABEL,
  SCOPE_HINT,
  SCOPE_LABEL,
  type Agent,
  type InstallScope,
  type InstallStatus,
} from '../types';

const STATUS_LABEL: Record<InstallStatus, string> = {
  'up-to-date': 'Up to date',
  behind: 'Behind',
  unknown: 'Unknown',
};

const STATUS_PALETTE: Record<InstallStatus, string> = {
  'up-to-date': 'green',
  behind: 'orange',
  unknown: 'gray',
};

export function StatusBadge({
  status,
  hint,
}: Readonly<{ status: InstallStatus; hint?: string }>) {
  const badge = (
    <PMBadge
      colorPalette={STATUS_PALETTE[status]}
      size="sm"
      variant={status === 'unknown' ? 'outline' : 'solid'}
    >
      {STATUS_LABEL[status]}
    </PMBadge>
  );
  if (!hint) return badge;
  return <PMTooltip label={hint}>{badge}</PMTooltip>;
}

export function ScopeBadge({ scope }: Readonly<{ scope: InstallScope }>) {
  return (
    <PMTooltip label={SCOPE_HINT[scope]}>
      <PMBadge
        colorPalette={scope === 'user' ? 'purple' : 'gray'}
        size="sm"
        variant="subtle"
        flexShrink={0}
      >
        {SCOPE_LABEL[scope]}
      </PMBadge>
    </PMTooltip>
  );
}

export function AgentBadge({ agent }: Readonly<{ agent: Agent }>) {
  return (
    <PMBadge colorPalette="blue" size="sm" variant="subtle" flexShrink={0}>
      {AGENT_LABEL[agent]}
    </PMBadge>
  );
}

export function GitIdentityBadge() {
  return (
    <PMTooltip label="Copilot exposes no account identity, so this is the git commit email — the same human may also appear under their Claude account">
      <PMBadge colorPalette="gray" size="sm" variant="subtle" flexShrink={0}>
        git email
      </PMBadge>
    </PMTooltip>
  );
}

export function SectionLabel({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <PMText
      fontSize="11px"
      color="faded"
      textTransform="uppercase"
      letterSpacing="wider"
      fontWeight="semibold"
    >
      {children}
    </PMText>
  );
}
