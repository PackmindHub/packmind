export interface GitlabRepositoryOptions {
  owner: string;
  repo: string;
  branch?: string;
  projectId?: string; // GitLab project ID for API calls (more reliable than path)
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
