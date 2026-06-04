import React, { createContext, useContext, useEffect } from 'react';
import { Analytics, type AnalyticsOptions } from './analytics';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';

const AnalyticsContext = createContext(Analytics);

export const AnalyticsProvider: React.FC<{
  options?: AnalyticsOptions;
  children?: React.ReactNode;
}> = ({ options, children }) => {
  const { isAuthenticated, user, organization, organizations } =
    useAuthContext();

  useEffect(() => {
    const initAnalytics = async () => {
      await Analytics.init(options);
    };
    initAnalytics();
  }, [options]);

  useEffect(() => {
    if (!isAuthenticated) {
      Analytics.setUserId();
      Analytics.setUserOrganizations([]);
      return;
    }
    if (user?.id) {
      Analytics.setUserId(String(user.id));
    }
    // Sync org context when available (covers refresh on org routes)
    if (organization) {
      Analytics.setUserProperties({
        orgId: String(organization.id),
        orgSlug: organization.slug,
        orgName: organization.name,
      });
      // Enrich group properties with organization name for dashboards/filters in Amplitude
      Analytics.setOrganizationGroupNames([
        { id: String(organization.id), name: organization.name },
      ]);
    }
    // Track all organizations of the user
    if (organizations && organizations.length > 0) {
      const orgIds = organizations.map((o) => String(o.organization.id));
      Analytics.setUserOrganizations(orgIds);
      // Also push group names for all orgs in user's scope (helps even before switching orgs)
      const groupNames = organizations.map((o) => ({
        id: String(o.organization.id),
        name: o.organization.name,
      }));
      Analytics.setOrganizationGroupNames(groupNames);
    } else {
      Analytics.setUserOrganizations([]);
    }
  }, [isAuthenticated, user?.id, organization, organizations]);

  return (
    <AnalyticsContext.Provider value={Analytics}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = () => useContext(AnalyticsContext);
