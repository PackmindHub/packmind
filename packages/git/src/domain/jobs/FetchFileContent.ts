import {
  GitRepoId,
  FetchFileContentFile,
  FetchedFileContent,
} from '@packmind/types';
import { OrganizationId } from '@packmind/types';

export interface FetchFileContentInput {
  organizationId: OrganizationId;
  gitRepoId: GitRepoId;
  files: FetchFileContentFile[];
}

export interface FetchFileContentOutput {
  organizationId: OrganizationId;
  gitRepoId: GitRepoId;
  files: FetchedFileContent[];
}
