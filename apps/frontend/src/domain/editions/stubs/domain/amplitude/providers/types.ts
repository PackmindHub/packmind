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
    artifactType: 'recipe' | 'standard' | 'skill';
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
  package_version_released: {
    packageId: string;
    version: string;
    componentsCount: number;
    changeSources: string[];
  };
  package_release_refused: {
    packageId: string;
    attemptedVersion: string;
    refusalReason: string;
  };
  package_version_distributed: {
    packageId: string;
    packageVersionId: string;
    version: string;
    marketplaceId: string;
    componentsCount: number;
    distributionSource: string;
  };
  plugin_adoption_viewed: {
    packageId: string | null;
    marketplaceId: string;
    distributedVersion: string | null;
    installsBehindCount: number;
  };
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
  /**
   * A reader moved between the two space navigations. `origin` separates an
   * invitation that was followed from a switch that was found: a link
   * carrying `?nav=` is how the beta is handed out, the switch on the profile
   * page is how somebody who already knows about it changes their mind.
   */
  navigation_mode_switched: {
    fromMode: 'today' | 'plugin-first';
    toMode: 'today' | 'plugin-first';
    origin: 'switch' | 'link';
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
  /**
   * Which space navigation this person is reading right now. Set for everyone,
   * `today` included: it is what lets every other event be split by
   * architecture, and a property posted only for the people who switched would
   * have no denominator to divide by.
   */
  navigationMode?: 'today' | 'plugin-first';
};
