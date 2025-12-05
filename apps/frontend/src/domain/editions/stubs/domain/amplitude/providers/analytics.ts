import type {
  AnalyticsEventMap,
  AnalyticsEventName,
  AnalyticsOptions,
  UserProperties,
} from './types';

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
