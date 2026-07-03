import { CodingAgent, StartTrialCommandAgents } from '@packmind/types';

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
  cli_login_done: Record<string, never>;
  default_skills_downloaded: {
    agent: CodingAgent;
  };
  skill_downloaded: {
    agent: CodingAgent;
    skillId: string;
  };
  onboarding_reason_selected: {
    reason_key: string;
    reason_label: string;
  };
  onboarding_reason_skipped: Record<string, never>;
  create_standard_from_samples_clicked: Record<string, never>;
  post_signup_onboarding_started: Record<string, never>;
  post_signup_onboarding_skipped: Record<string, never>;
  post_signup_onboarding_completed: Record<string, never>;
  post_signup_onboarding_agent_clicked: {
    agent: StartTrialCommandAgents;
  };
  post_signup_onboarding_field_copied: {
    field:
      | 'installSh'
      | 'installNpm'
      | 'installHomebrew'
      | 'cliInit'
      | 'cliStartAnalysis';
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
