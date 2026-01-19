import React from 'react';
import { PMVStack, PMText } from '@packmind/ui';
import { CopiableTextarea } from '../../../../../shared/components/inputs';
import { IMethodContentProps } from './types';
import { useAnalytics } from '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider';
import { useOnboardingAgent } from '../../../contexts';

export const CliMethodContent: React.FC<IMethodContentProps> = ({
  method,
  token,
  url,
}) => {
  const command = method.getCliCommand?.(token, url);
  const analytics = useAnalytics();
  const agent = useOnboardingAgent();

  if (!command) return null;

  return (
    <PMVStack gap={4} width="100%" alignItems="flex-start">
      <PMText as="p" fontSize="sm" color="secondary">
        Run this command in your terminal:
      </PMText>
      <CopiableTextarea
        value={command}
        readOnly
        rows={2}
        onCopy={() =>
          analytics.track('mcp_installed', { method: 'cli', agent })
        }
      />
    </PMVStack>
  );
};
