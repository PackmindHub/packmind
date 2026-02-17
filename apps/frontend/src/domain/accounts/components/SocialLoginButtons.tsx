import {
  PMButton,
  PMText,
  PMSeparator,
  PMHStack,
  PMIcon,
  PMImage,
} from '@packmind/ui';
import { googleLogo, microsoftLogo } from '@packmind/assets';
import { SiGithub } from 'react-icons/si';
import { ComponentType } from 'react';
import { useSocialProvidersQuery } from '../api/queries/AuthQueries';

const ICON_SIZE = '18px';

const PROVIDER_CONFIG: Record<
  string,
  { label: string; icon?: ComponentType; image?: string; color?: string }
> = {
  GoogleOAuth: { label: 'Google', image: googleLogo },
  GitHubOAuth: { label: 'GitHub', icon: SiGithub, color: '#FFFFFF' },
  MicrosoftOAuth: { label: 'Microsoft', image: microsoftLogo },
};

export default function SocialLoginButtons() {
  const { data, isLoading } = useSocialProvidersQuery();

  if (isLoading || !data?.providers || data.providers.length === 0) {
    return null;
  }

  return (
    <>
      {/* Separator above social buttons */}
      <PMHStack width="full" gap={4} alignItems="center">
        <PMSeparator flex="1" borderColor="border.tertiary" />
        <PMText variant="small" color="secondary">
          Or continue with
        </PMText>
        <PMSeparator flex="1" borderColor="border.tertiary" />
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
              {config?.image && (
                <PMImage
                  src={config.image}
                  alt={config.label}
                  width={ICON_SIZE}
                  height={ICON_SIZE}
                />
              )}
              {config?.icon && <PMIcon as={config.icon} color={config.color} />}
              {config?.label ?? provider}
            </PMButton>
          );
        })}
      </PMHStack>
    </>
  );
}
