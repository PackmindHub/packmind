export type GitHubAppManifest = {
  name: string;
  url: string;
  redirect_url: string;
  setup_url: string;
  setup_on_update: boolean;
  hook_attributes: {
    url: string;
  };
  public: boolean;
  default_permissions: {
    contents: 'read' | 'write';
    metadata: 'read' | 'write';
    pull_requests: 'read' | 'write';
  };
  default_events: string[];
};
