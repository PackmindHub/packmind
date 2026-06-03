export type CheckAuthFailureReason =
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'network';

export type CheckAuthResult =
  | { ok: true }
  | { ok: false; reason: CheckAuthFailureReason };

export interface IGitProvider {
  listAvailableRepositories: () => Promise<
    {
      name: string;
      owner: string;
      description?: string;
      private: boolean;
      defaultBranch: string;
      language?: string;
      stars: number;
    }[]
  >;

  checkBranchExists: (
    owner: string,
    repo: string,
    branch: string,
  ) => Promise<boolean>;

  checkAuth: () => Promise<CheckAuthResult>;
}
