export type Vendor = 'github' | 'gitlab';

export type ConnectionStatus = 'connected' | 'token_expired' | 'unreachable';

export type ConnectionRepo = {
  id: string;
  path: string;
  duplicatedIn?: string[];
};

export type UserConnection = {
  id: string;
  vendor: Vendor;
  displayName: string;
  identifier: string;
  status: ConnectionStatus;
  statusDetail?: string;
  lastPushAt: string | null;
  lastCheckedAt: string;
  installedBy: string;
  installedAt: string;
  repos: ConnectionRepo[];
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
