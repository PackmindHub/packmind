export const SOCIAL_PROVIDERS = [
  'GoogleOAuth',
  'MicrosoftOAuth',
  'GitHubOAuth',
] as const;

export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

export const SOCIAL_PROVIDER_DISPLAY_NAMES: Record<SocialProvider, string> = {
  GoogleOAuth: 'google',
  MicrosoftOAuth: 'microsoft',
  GitHubOAuth: 'github',
};
