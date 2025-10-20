import {
  GitRepoId,
  HandleWebHookWithoutContentResult,
  HandleWebHookResult,
} from '@packmind/shared';
import { OrganizationId } from '@packmind/accounts';

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
