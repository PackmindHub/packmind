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

class NoopAnalyticsService {
  private enabled = false;

  async init(_options?: AnalyticsOptions) {
    // nothing to initialize in OSS
    this.enabled = false;
  }

  enable() {
    // still a no-op in OSS
    this.enabled = false;
  }

  disable() {
    this.enabled = false;
  }

  reset() {
    // no-op
  }

  setUserId(_userId?: string) {
    // no-op
  }

  setUserProperties(_props: UserProperties) {
    // no-op
  }

  setUserOrganizations(_organizationIds: string[]) {
    // no-op
  }

  setOrganizationGroupNames(_orgIdToName: Array<{ id: string; name: string }>) {
    // no-op
  }

  track<E extends AnalyticsEventName>(
    _event: E,
    _payload: AnalyticsEventMap[E],
  ) {
    // no-op
  }
}

export const Analytics = new NoopAnalyticsService();
