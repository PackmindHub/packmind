export type DrawerMode = 'view' | 'edit-repos' | 'reauth';

export type RepoSelection = {
  trackedKeys: string[];
  branchByKey: Record<string, string>;
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
