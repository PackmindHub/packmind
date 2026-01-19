import React from 'react';
import { PMVStack, PMText } from '@packmind/ui';
import { CopiableTextarea } from '../../../../../shared/components/inputs';
import { IMethodContentProps } from './types';
import { useAnalytics } from '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider';
import { useOnboardingAgent } from '../../../contexts';

export const JsonMethodContent: React.FC<IMethodContentProps> = ({
  method,
  token,
  url,
}) => {
  const config = method.getJsonConfig?.(token, url);
  const analytics = useAnalytics();
  const agent = useOnboardingAgent();
  if (!config) return null;

  return (
    <PMVStack gap={4} width="100%" alignItems="flex-start">
      <PMText as="p" color="secondary">
        {method.label}:
      </PMText>
      <CopiableTextarea
        value={config}
        readOnly
        rows={12}
        onInteraction={() =>
          analytics.track('mcp_installed', { method: 'json', agent })
        }
      />
    </PMVStack>
  );
};
