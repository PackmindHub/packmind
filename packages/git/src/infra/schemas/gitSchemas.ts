import { GitProviderSchema } from './GitProviderSchema';
import { GitRepoSchema } from './GitRepoSchema';
import { GitCommitSchema } from './GitCommitSchema';
import { OrganizationGitHubAppSchema } from './OrganizationGitHubAppSchema';

export const gitSchemas = [
  GitProviderSchema,
  GitRepoSchema,
  GitCommitSchema,
  OrganizationGitHubAppSchema,
];
