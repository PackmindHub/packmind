export type Vendor = 'github' | 'gitlab';

export type ConnectionStatus = 'connected' | 'token_expired' | 'unreachable';

export type ConnectionRepo = {
  id: string;
  path: string;
  branch: string;
  defaultBranch: string;
  duplicatedIn?: string[];
};

export type AvailableRepo = {
  id: string;
  path: string;
  defaultBranch: string;
};

export type UserConnection = {
  id: string;
  vendor: Vendor;
  authMethod: AuthMethod;
  displayName: string;
  identifier: string;
  status: ConnectionStatus;
  statusDetail?: string;
  lastPushAt: string | null;
  lastCheckedAt: string;
  installedBy: string;
  installedAt: string;
  repos: ConnectionRepo[];
  availableRepos: AvailableRepo[];
};

export type CliManagedEntry = {
  id: string;
  vendor: Vendor;
  instance: string;
  repoPath: string;
  createdBy: string;
  createdByEmailMasked: string;
  createdAt: string;
};

export type Scenario =
  | 'default'
  | 'empty'
  | 'loading'
  | 'mixed-errors'
  | 'name-collision';

export type DrawerSection = 'overview' | 'repos';

export type Edition = 'cloud' | 'oss';

export type AuthMethod = 'app' | 'pat';

export type AppRegistrationStatus = 'idle' | 'registering' | 'registered';

export type AppInstallStatus = 'idle' | 'installing' | 'installed';

export type AddConnectionSubmitStatus = 'idle' | 'submitting' | 'error';

export type DrawerMode = 'view' | 'edit-repos' | 'reauth';

export type RepoSelectionState = {
  trackedIds: string[];
  branchByRepoId: Record<string, string>;
};

export type ReauthStatus = 'idle' | 'validating' | 'success' | 'error';

export type ReauthDraft = {
  patValue: string;
  status: ReauthStatus;
  errorMessage: string | null;
  appPopupOpen: boolean;
};

export type AddConnectionDraft = {
  vendor: Vendor;
  instanceUrl: string;
  displayName: string;
  authMethod: AuthMethod;
  patValue: string;
  patPermissionsAcknowledged: boolean;
  appRegistration: AppRegistrationStatus;
  appInstall: AppInstallStatus;
  appConnectedIdentifier: string | null;
  submit: AddConnectionSubmitStatus;
  submitError: string | null;
};
