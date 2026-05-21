import React, { useState } from 'react';
import { PMVStack, PMBox } from '@packmind/ui';
import { CopiableTextField } from '../../../../../shared/components/inputs';
import { AuthMethod } from '../types';
import { buildCliLoginCommand } from '../utils';
import { useApiKey } from '../hooks';
import {
  SectionCard,
  StepHeader,
  AuthMethodSelector,
  ApiKeyGenerator,
} from '../components';

const LoginCommandContent: React.FC = () => (
  <SectionCard
    title="Login command"
    description="Opens your browser to complete login. An API key is stored locally (expires after 3 months)."
  >
    <PMBox width="1/2">
      <CopiableTextField
        value={buildCliLoginCommand()}
        readOnly
        label="Terminal"
      />
    </PMBox>
  </SectionCard>
);

const ApiKeyContent: React.FC = () => {
  const apiKey = useApiKey();

  return (
    <SectionCard
      title="API key"
      description="Generate an API key to use as an environment variable. It will expire after 3 months."
    >
      <ApiKeyGenerator apiKey={apiKey} />
    </SectionCard>
  );
};

export const AuthenticateStep: React.FC = () => {
  const [authMethod, setAuthMethod] = useState<AuthMethod>('login-command');

  return (
    <PMVStack align="flex-start" gap={6} width="full" padding={4}>
      <StepHeader
        title="Authenticate with Packmind"
        description="Choose how you want to authenticate."
      />

      <AuthMethodSelector value={authMethod} onChange={setAuthMethod} />

      {authMethod === 'login-command' ? (
        <LoginCommandContent />
      ) : (
        <ApiKeyContent />
      )}
    </PMVStack>
  );
};
