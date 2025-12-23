import React from 'react';
import { PMVStack, PMText } from '@packmind/ui';
import { CopiableTextarea } from '../../../../../shared/components/inputs';
import { IMethodContentProps } from './types';

export const JsonMethodContent: React.FC<IMethodContentProps> = ({
  method,
  token,
  url,
}) => {
  const config = method.getJsonConfig?.(token, url);
  if (!config) return null;

  return (
    <PMVStack gap={4} width="100%" alignItems="flex-start">
      <PMText as="p" color="secondary">
        {method.label}:
      </PMText>
      <CopiableTextarea value={config} readOnly rows={12} />
    </PMVStack>
  );
};
