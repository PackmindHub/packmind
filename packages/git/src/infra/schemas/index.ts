import { GitRepoSchema } from './GitRepoSchema';
import { GitProviderSchema } from './GitProviderSchema';
import { GitCommitSchema } from './GitCommitSchema';

export { GitRepoSchema, GitProviderSchema, GitCommitSchema };
export const gitSchemas = [GitProviderSchema, GitRepoSchema, GitCommitSchema];
