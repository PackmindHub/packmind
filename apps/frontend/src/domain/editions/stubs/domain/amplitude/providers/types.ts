import { StartTrialCommandAgents } from '@packmind/types';

export type AnalyticsEventMap = {
  page_view: {
    path: string;
    routeId?: string;
    orgSlug?: string;
    title?: string;
  };
  user_signed_in: {
    method: 'email' | 'github' | 'gitlab' | 'google' | 'sso';
  };
  artifact_updated: {
    artifactType: 'recipe' | 'standard';
    id: string;
    from: number;
    to: number;
  };
  mcp_configuration_card_clicked: {
    agent: string;
  };
  cli_login_done: Record<string, never>;
  mcp_installed: {
    method: 'cli' | 'magic-link' | 'json';
    agent: StartTrialCommandAgents;
  };
  onboarding_prompt_copied: {
    agent: StartTrialCommandAgents;
  };
  mcp_unavailable_feedback: {
    reason: 'cant-use-mcp' | 'dont-want-mcp' | 'dont-know-mcp' | 'other';
    otherDetails?: string;
    selectedAgent: StartTrialCommandAgents;
  };
};

export type AnalyticsEventName = keyof AnalyticsEventMap;

export type AnalyticsOptions = {
  apiKey?: string;
  enabled?: boolean;
  appVersion?: string;
  environment?: string;
  serverZone?: 'US' | 'EU';
};

export type UserProperties = Record<string, unknown> & {
  orgId?: string;
  orgSlug?: string;
  orgName?: string;
  plan?: string;
  edition?: 'oss' | 'proprietary';
};
