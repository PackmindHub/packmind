import {
  GitRepoId,
  HandleWebHookWithoutContentResult,
  HandleWebHookResult,
} from '@packmind/types';
import { OrganizationId } from '@packmind/types';

export interface FetchFileContentInput {
  organizationId: OrganizationId;
  gitRepoId: GitRepoId;
  files: HandleWebHookWithoutContentResult;
}

export interface FetchFileContentOutput {
  organizationId: OrganizationId;
  gitRepoId: GitRepoId;
  files: HandleWebHookResult;
}
