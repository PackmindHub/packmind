export interface GitlabRepositoryOptions {
  owner: string;
  repo: string;
  branch?: string;
  projectId?: string; // GitLab project ID for API calls (more reliable than path)
}

export interface GitlabWebhookPushPayload {
  object_kind: string;
  event_name: string;
  before: string;
  after: string;
  ref: string;
  ref_protected: boolean;
  checkout_sha: string;
  user_id: number;
  user_name: string;
  user_username: string;
  user_email: string;
  user_avatar: string;
  project_id: number;
  project: {
    id: number;
    name: string;
    description: string;
    web_url: string;
    avatar_url: string | null;
    git_ssh_url: string;
    git_http_url: string;
    namespace: string;
    visibility_level: number;
    path_with_namespace: string;
    default_branch: string;
    ci_config_path: string | null;
    homepage: string;
    url: string;
    ssh_url: string;
    http_url: string;
  };
  commits: Array<{
    id: string;
    message: string;
    title: string;
    timestamp: string;
    url: string;
    author: {
      name: string;
      email: string;
    };
    added: string[];
    modified: string[];
    removed: string[];
  }>;
  total_commits_count: number;
}

export interface GitlabProject {
  id: number;
  name: string;
  description?: string;
  default_branch: string;
  visibility: string;
  star_count: number;
  forks_count: number;
  path_with_namespace: string; // Full path like "promyze/sandbox/protomind"
  namespace: {
    name: string;
    path: string;
    full_path: string; // Full namespace path like "promyze/sandbox"
  };
  permissions?: {
    project_access?: {
      access_level: number;
    };
    group_access?: {
      access_level: number;
    };
  };
}

export interface GitlabFile {
  file_name: string;
  file_path: string;
  size: number;
  encoding: string;
  content: string;
  content_sha256?: string;
  ref: string;
  blob_id: string;
  commit_id: string;
  last_commit_id: string;
}

export interface GitlabBranch {
  name: string;
  merged: boolean;
  protected: boolean;
  default: boolean;
  developers_can_push: boolean;
  developers_can_merge: boolean;
  can_push: boolean;
  web_url: string;
  commit: {
    id: string;
    short_id: string;
    title: string;
    author_name: string;
    author_email: string;
    authored_date: string;
    committer_name: string;
    committer_email: string;
    committed_date: string;
    created_at: string;
    message: string;
    web_url: string;
  };
}

// GitLab access levels
export const GITLAB_ACCESS_LEVELS = {
  NO_ACCESS: 0,
  GUEST: 10,
  REPORTER: 20,
  DEVELOPER: 30,
  MAINTAINER: 40,
  OWNER: 50,
} as const;

// Minimum access level required to push to repositories
export const MIN_PUSH_ACCESS_LEVEL = GITLAB_ACCESS_LEVELS.DEVELOPER;
