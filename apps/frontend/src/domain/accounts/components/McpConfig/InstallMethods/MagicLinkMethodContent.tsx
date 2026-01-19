import React from 'react';
import { PMVStack, PMText, PMHStack, PMLink, PMButton } from '@packmind/ui';
import { VSCodeIcon } from './VSCodeIcon';
import { IMethodContentProps } from './types';
import { useAnalytics } from '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider';

const VSCodeInstallBadge: React.FC<{ href: string }> = ({ href }) => {
  const analytics = useAnalytics();

  return (
    <PMLink
      href={href}
      variant="plain"
      data-testid="vscode-install-button"
      onMouseDown={() =>
        analytics.track('mcp_installed', { method: 'magic-link' })
      }
    >
      <PMButton as="span" bg="#007ACC" color="white" _hover={{ bg: '#005a9e' }}>
        <VSCodeIcon />
        Install in VS Code
      </PMButton>
    </PMLink>
  );
};

const CursorInstallBadge: React.FC<{ href: string }> = ({ href }) => {
  const analytics = useAnalytics();

  return (
    <a
      href={href}
      data-testid="cursor-install-button"
      onMouseDown={() =>
        analytics.track('mcp_installed', { method: 'magic-link' })
      }
    >
      <img
        src="https://cursor.com/deeplink/mcp-install-dark.png"
        alt="Add Packmind MCP server to Cursor"
        style={{ maxHeight: 32 }}
      />
    </a>
  );
};

export const MagicLinkMethodContent: React.FC<IMethodContentProps> = ({
  method,
  token,
  url,
}) => {
  const magicLink = method.getMagicLink?.(token, url);
  if (!magicLink) return null;

  const isVSCode = magicLink.startsWith('vscode:');

  return (
    <PMVStack gap={4} width="100%" alignItems="flex-start">
      <PMText as="p" fontSize="sm" color="secondary">
        Click the button below to install automatically:
      </PMText>
      <PMHStack gap={4}>
        {isVSCode ? (
          <VSCodeInstallBadge href={magicLink} />
        ) : (
          <CursorInstallBadge href={magicLink} />
        )}
      </PMHStack>
    </PMVStack>
  );
};
