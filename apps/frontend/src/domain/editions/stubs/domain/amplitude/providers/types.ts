import { CodingAgent, StartTrialCommandAgents } from '@packmind/types';

export enum McpUnavailableReason {
  CantUseMcp = 'cant-use-mcp',
  DontWantMcp = 'dont-want-mcp',
  DontKnowMcp = 'dont-know-mcp',
  Other = 'other',
}

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
    method: 'cli' | 'magic-link' | 'json' | 'install-cli';
    agent: StartTrialCommandAgents;
  };
  onboarding_prompt_copied: {
    agent: StartTrialCommandAgents;
  };
  mcp_unavailable_feedback: {
    reason: McpUnavailableReason;
    otherDetails?: string;
    selectedAgent: StartTrialCommandAgents;
  };
  default_skills_downloaded: {
    agent: CodingAgent;
  };
  onboarding_reason_selected: {
    reason_key: string;
    reason_label: string;
  };
  onboarding_reason_skipped: Record<string, never>;
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
