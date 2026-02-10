import React from 'react';
import { PMVStack, PMText, PMButton } from '@packmind/ui';
import { CopiableTextarea } from '../../../../../shared/components/inputs';
import { IMethodContentProps } from './types';
import { useAnalytics } from '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider';
import { useOnboardingAgent } from '../../../contexts';

export const JsonMethodContent: React.FC<IMethodContentProps> = ({
  method,
  token,
  url,
  onCantUseMcp,
}) => {
  const config = method.getJsonConfig?.(token, url);
  const analytics = useAnalytics();
  const agent = useOnboardingAgent();
  if (!config) return null;

  return (
    <PMVStack gap={4} width="100%" alignItems="flex-start">
      {method.filePath && (
        <PMText as="p" color="secondary">
          Update <code>{method.filePath}</code> with this configuration:
        </PMText>
      )}
      <CopiableTextarea
        value={config}
        readOnly
        rows={12}
        onCopy={() =>
          analytics.track('mcp_installed', { method: 'json', agent })
        }
      />
      {onCantUseMcp && (
        <PMVStack width="full" alignItems="center">
          <PMButton variant="tertiary" size="xs" onClick={onCantUseMcp}>
            I can't use MCP
          </PMButton>
        </PMVStack>
      )}
    </PMVStack>
  );
};
