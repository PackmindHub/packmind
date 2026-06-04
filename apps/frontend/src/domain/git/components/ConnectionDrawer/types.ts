export type DrawerMode = 'view' | 'edit-repos' | 'reauth';

export type RepoTuple = {
  owner: string;
  repo: string;
  branch: string;
};

// Git ref-format rules forbid `:` in branch names, so `::` is a safe delimiter.
export const tupleKey = (t: RepoTuple): string =>
  `${t.owner}/${t.repo}::${t.branch}`;

export type RepoSelection = {
  tuples: RepoTuple[];
};

export type ApplyProgressPhase = 'running' | 'error';

export type ApplyProgress = {
  phase: ApplyProgressPhase;
  current: number;
  total: number;
  label: string;
  errorMessage?: string;
};

export type ReauthStatus = 'idle' | 'validating' | 'success' | 'error';

export type ReauthDraft = {
  patValue: string;
  status: ReauthStatus;
  errorMessage: string | null;
};
