import {
  PMButton,
  PMVStack,
  PMText,
  PMSeparator,
  PMHStack,
  PMIcon,
} from '@packmind/ui';
import { SiGoogle, SiGithub } from 'react-icons/si';
import { FaMicrosoft } from 'react-icons/fa';
import { ComponentType } from 'react';
import { useSocialProvidersQuery } from '../api/queries/AuthQueries';

const PROVIDER_CONFIG: Record<
  string,
  { label: string; icon: ComponentType; color: string }
> = {
  GoogleOAuth: { label: 'Google', icon: SiGoogle, color: '#4285F4' },
  GitHubOAuth: { label: 'GitHub', icon: SiGithub, color: '#FFFFFF' },
  MicrosoftOAuth: { label: 'Microsoft', icon: FaMicrosoft, color: '#00A4EF' },
};

export default function SocialLoginButtons() {
  const { data, isLoading } = useSocialProvidersQuery();

  if (isLoading || !data?.providers || data.providers.length === 0) {
    return null;
  }

  return (
    <>
      {/* Separator above social buttons */}
      <PMHStack width="full" gap={4} alignItems="center" paddingY={2}>
        <PMSeparator flex="1" />
        <PMText variant="small" color="secondary">
          Or continue with
        </PMText>
        <PMSeparator flex="1" />
      </PMHStack>

      <PMHStack gap={3} width="full">
        {data.providers.map((provider) => {
          const config = PROVIDER_CONFIG[provider];
          return (
            <PMButton
              key={provider}
              variant="outline"
              flex="1"
              onClick={() => {
                window.location.href = `/api/v0/auth/social/authorize/${provider}`;
              }}
            >
              {config && <PMIcon as={config.icon} color={config.color} />}
              {config?.label ?? provider}
            </PMButton>
          );
        })}
      </PMHStack>
    </>
  );
}
