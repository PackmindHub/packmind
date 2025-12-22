import React from 'react';
import { PMVStack, PMText } from '@packmind/ui';
import { CopiableTextarea } from '../../../../../shared/components/inputs';
import { IMethodContentProps } from './types';

export const CliMethodContent: React.FC<IMethodContentProps> = ({
  method,
  token,
  url,
}) => {
  const command = method.getCliCommand?.(token, url);
  if (!command) return null;

  return (
    <PMVStack gap={4} width="100%" alignItems="flex-start">
      <PMText as="p" fontSize="sm" color="faded">
        Run this command in your terminal:
      </PMText>
      <CopiableTextarea value={command} readOnly rows={2} />
    </PMVStack>
  );
};
