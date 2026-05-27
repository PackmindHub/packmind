import { GitRepoSchema } from './GitRepoSchema';
import { GitProviderSchema } from './GitProviderSchema';
import { GitCommitSchema } from './GitCommitSchema';
import { GitHubAppConfigSchema } from './GitHubAppConfigSchema';

export {
  GitRepoSchema,
  GitProviderSchema,
  GitCommitSchema,
  GitHubAppConfigSchema,
};
export const gitSchemas = [
  GitProviderSchema,
  GitRepoSchema,
  GitCommitSchema,
  GitHubAppConfigSchema,
];
