import { GitHubAppConfig } from '@packmind/types';

export interface IGitHubAppConfigRepository {
  findActive(): Promise<GitHubAppConfig | null>;
  save(config: Omit<GitHubAppConfig, 'id'>): Promise<GitHubAppConfig>;
  deleteActive(): Promise<void>;
}
