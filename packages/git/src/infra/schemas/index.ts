import { GitRepoSchema } from './GitRepoSchema';
import { GitProviderSchema } from './GitProviderSchema';
import { GitCommitSchema } from './GitCommitSchema';
import { OrganizationGitHubAppSchema } from './OrganizationGitHubAppSchema';

export {
  GitRepoSchema,
  GitProviderSchema,
  GitCommitSchema,
  OrganizationGitHubAppSchema,
};
export const gitSchemas = [
  GitProviderSchema,
  GitRepoSchema,
  GitCommitSchema,
  OrganizationGitHubAppSchema,
];
