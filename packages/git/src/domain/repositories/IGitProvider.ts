import { ExternalRepository } from '@packmind/types';

export type CheckAuthFailureReason =
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'network';

export type CheckAuthResult =
  | { ok: true }
  | { ok: false; reason: CheckAuthFailureReason };

export type ListAvailableRepositoriesResult = {
  repositories: ExternalRepository[];
  // Total number of pages the provider exposes for the current listing, so
  // callers can paginate without fetching everything up front.
  totalPages: number;
  // The last provider page actually fetched to satisfy this request. Because we
  // drop repositories we lack write access to, a single logical page may consume
  // several provider pages, so callers must resume pagination from
  // `lastLoadedPage + 1` rather than from the requested page.
  lastLoadedPage: number;
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

  checkAuth: () => Promise<CheckAuthResult>;
}
