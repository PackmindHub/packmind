import { Branded, brandedIdFactory } from '../brandedTypes';

export type GitHubAppConfigId = Branded<'GitHubAppConfigId'>;
export const createGitHubAppConfigId = brandedIdFactory<GitHubAppConfigId>();

export type GitHubAppConfig = {
  id: GitHubAppConfigId;
  appId: number;
  slug: string;
  htmlUrl: string;
  clientId: string;
  clientSecret: string;
  privateKey: string;
  webhookSecret: string;
};

export type GitHubAppConfigSummary = Omit<
  GitHubAppConfig,
  'clientSecret' | 'privateKey' | 'webhookSecret'
>;
