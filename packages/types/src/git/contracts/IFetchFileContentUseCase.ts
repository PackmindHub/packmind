import { OrganizationId } from '../../accounts/Organization';
import { GitRepoId } from '../GitRepoId';
import { HandleWebHookResult } from './IHandleWebHookUseCase';
import { HandleWebHookWithoutContentResult } from './IHandleWebHookWithoutContentUseCase';

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
