import * as amplitude from '@amplitude/analytics-browser';
import type {
  AnalyticsEventMap,
  AnalyticsEventName,
  AnalyticsOptions,
  UserProperties,
} from './types';
import { ServerZoneType } from '@amplitude/analytics-core';
import { amplitudeGateway } from '../api/gateways';

class AnalyticsService {
  private initialized = false;
  private enabled = true;
  private currentUserId: string | undefined;
  private queue: Array<() => void> = [];

  async init(options?: AnalyticsOptions) {
    if (this.initialized) return;

    const { apiKey, serverZone } = await this.getConfig();
    if (options?.enabled !== undefined) {
      this.enabled = options.enabled;
    }

    if (!apiKey) {
      this.initialized = true; // mark initialized to flush no-ops cleanly
      this.flushQueue();
      return;
    }

    amplitude.init(apiKey, undefined, {
      serverUrl: amplitudeGateway.getProxyUrl(),
      serverZone,
      defaultTracking: {
        sessions: true,
        pageViews: true,
        formInteractions: false,
        fileDownloads: false,
      },
      trackingOptions: {
        ipAddress: false,
      },
    });

    this.initialized = true;
    // Start opted-out: gate is closed unless consent AND a userId are set.
    this.applyOptOut();
    this.flushQueue();
  }

  enable() {
    this.enabled = true;
    this.applyOptOut();
  }

  disable() {
    this.enabled = false;
    this.applyOptOut();
  }

  reset() {
    this.currentUserId = undefined;
    this.runOrQueue(() => {
      try {
        amplitude.reset();
      } catch {
        // ignore
      }
    });
    this.applyOptOut();
  }

  setUserId(userId?: string) {
    this.currentUserId = userId;
    this.runOrQueue(() => amplitude.setUserId(userId));
    this.applyOptOut();
  }

  setUserProperties(props: UserProperties) {
    this.runOrQueue(() => {
      type AllowedValue = string | number | boolean | Array<string | number>;
      const toAllowedValue = (value: unknown): AllowedValue => {
        if (Array.isArray(value)) {
          const coerced = (value as unknown[]).map((e) =>
            typeof e === 'number' || typeof e === 'string' ? e : String(e),
          );
          return coerced;
        }
        if (value !== null && typeof value === 'object') {
          return JSON.stringify(value);
        }
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          return value;
        }
        return String(value);
      };

      const identify = new amplitude.Identify();
      Object.entries(props).forEach(([key, value]) => {
        try {
          identify.set(key, toAllowedValue(value));
        } catch {
          // ignore invalid types
        }
      });
      amplitude.identify(identify);
    });
  }

  setUserOrganizations(organizationIds: string[]) {
    this.runOrQueue(() => {
      if (organizationIds && organizationIds.length > 0) {
        amplitude.setGroup('organization', organizationIds);
      } else {
        amplitude.setGroup('organization', []);
      }
    });
  }

  /**
   * Attach organization names to the current user's org groups using group properties.
   * Amplitude best practice: use setGroup to bind user to a group, then groupIdentify to enrich group properties
   * with stable identifiers and human-friendly names for filtering and dashboards.
   */
  setOrganizationGroupNames(orgIdToName: Array<{ id: string; name: string }>) {
    this.runOrQueue(() => {
      try {
        // Enrich each organization group with its display name
        for (const { id, name } of orgIdToName) {
          if (!id) continue;
          const identify = new amplitude.Identify();
          identify.set('name', name || '');
          // groupType must match the one used in setGroup above ("organization")
          amplitude.groupIdentify('organization', id, identify);
        }
      } catch {
        // ignore
      }
    });
  }

  track<E extends AnalyticsEventName>(event: E, payload: AnalyticsEventMap[E]) {
    this.runOrQueue(() =>
      amplitude.track(event, payload as Record<string, unknown>),
    );
  }

  private applyOptOut() {
    if (!this.initialized) return;
    const shouldOptOut = !this.enabled || !this.currentUserId;
    try {
      amplitude.setOptOut(shouldOptOut);
    } catch {
      // ignore
    }
  }

  private async getConfig(
    options?: AnalyticsOptions,
  ): Promise<{ apiKey?: string; serverZone?: ServerZoneType }> {
    try {
      const config = await amplitudeGateway.getConfig();

      return {
        apiKey: config.amplitudeKey,
        serverZone: config.amplitudeRegion as ServerZoneType,
        ...options,
      };
    } catch {
      return { ...options };
    }
  }

  private runOrQueue(fn: () => void) {
    if (!this.enabled) return; // respect consent
    if (!this.initialized) {
      this.queue.push(fn);
      return;
    }
    try {
      fn();
    } catch {
      // avoid throwing in UI code
    }
  }

  private flushQueue() {
    if (!this.enabled) {
      this.queue = [];
      return;
    }
    const q = this.queue;
    this.queue = [];
    for (const fn of q) {
      try {
        fn();
      } catch {
        // swallow
      }
    }
  }
}

export const Analytics = new AnalyticsService();
export type {
  AnalyticsEventMap,
  AnalyticsEventName,
  AnalyticsOptions,
  UserProperties,
};
