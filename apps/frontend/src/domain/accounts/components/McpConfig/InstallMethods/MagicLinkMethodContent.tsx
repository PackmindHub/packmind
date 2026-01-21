import React from 'react';
import { PMVStack, PMText, PMHStack, PMLink, PMButton } from '@packmind/ui';
import { VSCodeIcon } from './VSCodeIcon';
import { IMethodContentProps } from './types';
import { useAnalytics } from '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider';
import { useOnboardingAgent } from '../../../contexts';

const VSCodeInstallBadge: React.FC<{ href: string }> = ({ href }) => {
  const analytics = useAnalytics();
  const agent = useOnboardingAgent();

  return (
    <PMLink
      href={href}
      variant="plain"
      data-testid="vscode-install-button"
      onMouseDown={() =>
        analytics.track('mcp_installed', { method: 'magic-link', agent })
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
  const agent = useOnboardingAgent();

  return (
    <a
      href={href}
      data-testid="cursor-install-button"
      onMouseDown={() =>
        analytics.track('mcp_installed', { method: 'magic-link', agent })
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
  onCantUseMcp,
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
          <>
            <VSCodeInstallBadge href={magicLink} />
            {onCantUseMcp && (
              <PMButton variant="tertiary" onClick={onCantUseMcp}>
                I can't use MCP
              </PMButton>
            )}
          </>
        ) : (
          <>
            <CursorInstallBadge href={magicLink} />
            {onCantUseMcp && (
              <PMButton variant="tertiary" size="xs" onClick={onCantUseMcp}>
                I can't use MCP
              </PMButton>
            )}
          </>
        )}
      </PMHStack>
    </PMVStack>
  );
};
