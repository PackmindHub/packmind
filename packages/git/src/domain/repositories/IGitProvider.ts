import { ExternalRepository } from '@packmind/types';

export type CheckAuthFailureReason =
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'network'
  | 'token_unreadable';

export type CheckAuthResult =
  | { ok: true }
  | { ok: false; reason: CheckAuthFailureReason };

export type ListAvailableRepositoriesResult = {
  repositories: ExternalRepository[];
  totalPages: number;
  // Because repositories we lack write access to are dropped, one logical page
  // may consume several provider pages: callers must resume pagination from
  // `lastLoadedPage + 1`, not from the page they requested.
  lastLoadedPage: number;
  // A provider page failed partway through, so the batch was cut short. The
  // repositories returned are still usable; the rest come from resuming
  // pagination.
  partial: boolean;
};

export interface IGitProvider {
  listAvailableRepositories: (
    page?: number,
  ) => Promise<ListAvailableRepositoriesResult>;

  checkBranchExists: (
    owner: string,
    repo: string,
    branch: string,
  ) => Promise<boolean>;

  // Substring match on the branch name; an empty search lists the first
  // `limit` branches. Names only.
  searchBranches: (
    owner: string,
    repo: string,
    search: string,
    limit: number,
  ) => Promise<string[]>;

  checkAuth: () => Promise<CheckAuthResult>;
}
