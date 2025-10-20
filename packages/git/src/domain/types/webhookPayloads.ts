/**
 * Webhook payload types for Git providers
 * These types define the structure of webhook payloads received from different Git providers
 */

/**
 * GitHub webhook push event payload structure
 * @see https://docs.github.com/en/webhooks/webhook-events-and-payloads#push
 */
export interface GithubWebhookPushPayload {
  ref?: string;
  repository?: {
    name?: string;
    owner?: {
      name?: string;
    };
  };
  commits?: Array<{
    id?: string;
    message?: string;
    added?: string[];
    modified?: string[];
    removed?: string[];
    author?: {
      name?: string;
      email?: string;
    };
  }>;
}

/**
 * GitLab webhook push event payload structure
 * @see https://docs.gitlab.com/ee/user/project/integrations/webhook_events.html#push-events
 */
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
