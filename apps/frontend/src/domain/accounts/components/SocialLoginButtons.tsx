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

const PROVIDER_CONFIG: Record<string, { label: string; icon: ComponentType }> =
  {
    GoogleOAuth: { label: 'Continue with Google', icon: SiGoogle },
    GitHubOAuth: { label: 'Continue with GitHub', icon: SiGithub },
    MicrosoftOAuth: { label: 'Continue with Microsoft', icon: FaMicrosoft },
  };

export default function SocialLoginButtons() {
  const { data, isLoading } = useSocialProvidersQuery();

  if (isLoading || !data?.providers || data.providers.length === 0) {
    return null;
  }

  return (
    <PMVStack gap={4} width="full">
      {data.providers.map((provider) => {
        const config = PROVIDER_CONFIG[provider];
        return (
          <PMButton
            key={provider}
            variant="outline"
            width="full"
            onClick={() => {
              window.location.href = `/api/v0/auth/social/authorize/${provider}`;
            }}
          >
            {config && <PMIcon as={config.icon} />}
            {config?.label ?? provider}
          </PMButton>
        );
      })}

      <PMHStack width="full" gap={4} alignItems="center">
        <PMSeparator flex="1" />
        <PMText variant="small" color="secondary">
          or
        </PMText>
        <PMSeparator flex="1" />
      </PMHStack>
    </PMVStack>
  );
}
