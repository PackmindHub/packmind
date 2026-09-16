import { isFeatureFlagEnabled } from './isFeatureFlagEnabled';
import {
  ADD_CHANGE_PROPOSALS_IN_WEBAPP_FEATURE_KEY,
  DEFAULT_FEATURE_DOMAIN_MAP,
} from './registry';

describe('isFeatureFlagEnabled', () => {
  const featureDomainMap = {
    featureA: ['packmind.com', 'example.com'],
    featureB: ['@packmind.com'],
  };

  describe('when email domain matches configured feature', () => {
    it('returns true', () => {
      const isEnabled = isFeatureFlagEnabled({
        featureKeys: ['featureA'],
        featureDomainMap,
        userEmail: 'user@packmind.com',
      });

      expect(isEnabled).toBe(true);
    });
  });

  describe('when email domain is not configured', () => {
    it('returns false', () => {
      const isEnabled = isFeatureFlagEnabled({
        featureKeys: ['featureA'],
        featureDomainMap,
        userEmail: 'user@restricted.com',
      });

      expect(isEnabled).toBe(false);
    });
  });

  describe('when feature keys array is empty', () => {
    it('returns true', () => {
      const isEnabled = isFeatureFlagEnabled({
        featureKeys: [],
        featureDomainMap,
        userEmail: 'user@restricted.com',
      });

      expect(isEnabled).toBe(true);
    });
  });

  describe('when user email is missing', () => {
    it('returns false', () => {
      const isEnabled = isFeatureFlagEnabled({
        featureKeys: ['featureA'],
        featureDomainMap,
      });

      expect(isEnabled).toBe(false);
    });
  });

  describe('when evaluating features with @ prefixed domains', () => {
    it('handles domains prefixed with @', () => {
      const isEnabled = isFeatureFlagEnabled({
        featureKeys: ['featureB'],
        featureDomainMap,
        userEmail: 'user@packmind.com',
      });

      expect(isEnabled).toBe(true);
    });
  });

  describe('when feature is not configured for the user domain', () => {
    it('returns false', () => {
      const isEnabled = isFeatureFlagEnabled({
        featureKeys: ['featureB'],
        featureDomainMap,
        userEmail: 'user@promyze.com',
      });

      expect(isEnabled).toBe(false);
    });
  });

  it('enables the change-proposals-in-webapp feature for allowed domains', () => {
    const isEnabled = isFeatureFlagEnabled({
      featureKeys: [ADD_CHANGE_PROPOSALS_IN_WEBAPP_FEATURE_KEY],
      featureDomainMap: DEFAULT_FEATURE_DOMAIN_MAP,
      userEmail: 'member@promyze.com',
    });

    expect(isEnabled).toBe(true);
  });

  describe('when entry is an exact email match', () => {
    const exactEmailMap = {
      featureExact: ['joan.racenet@packmind.com'],
    };

    it('enables the feature for the exact email', () => {
      const isEnabled = isFeatureFlagEnabled({
        featureKeys: ['featureExact'],
        featureDomainMap: exactEmailMap,
        userEmail: 'joan.racenet@packmind.com',
      });

      expect(isEnabled).toBe(true);
    });

    it('matches the email case-insensitively', () => {
      const isEnabled = isFeatureFlagEnabled({
        featureKeys: ['featureExact'],
        featureDomainMap: exactEmailMap,
        userEmail: 'Joan.Racenet@Packmind.com',
      });

      expect(isEnabled).toBe(true);
    });

    it('does not enable the feature for other users on the same domain', () => {
      const isEnabled = isFeatureFlagEnabled({
        featureKeys: ['featureExact'],
        featureDomainMap: exactEmailMap,
        userEmail: 'someone-else@packmind.com',
      });

      expect(isEnabled).toBe(false);
    });
  });

  describe('when the entry opens the flag to every account', () => {
    const openMap = {
      featureOpen: ['*'],
    };

    it('enables the feature for a domain nobody listed', () => {
      const isEnabled = isFeatureFlagEnabled({
        featureKeys: ['featureOpen'],
        featureDomainMap: openMap,
        userEmail: 'someone@unknown-company.com',
      });

      expect(isEnabled).toBe(true);
    });

    it('still refuses somebody who is not signed in', () => {
      const isEnabled = isFeatureFlagEnabled({
        featureKeys: ['featureOpen'],
        featureDomainMap: openMap,
        userEmail: null,
      });

      expect(isEnabled).toBe(false);
    });

    describe('when it sits beside a domain', () => {
      it('opens the flag anyway, since one entry is enough', () => {
        const isEnabled = isFeatureFlagEnabled({
          featureKeys: ['featureOpen'],
          featureDomainMap: { featureOpen: ['@packmind.com', '*'] },
          userEmail: 'someone@unknown-company.com',
        });

        expect(isEnabled).toBe(true);
      });
    });

    describe('when the star is part of a longer entry', () => {
      it('does not open the flag, since only the entry itself means everybody', () => {
        const isEnabled = isFeatureFlagEnabled({
          featureKeys: ['featureOpen'],
          featureDomainMap: { featureOpen: ['*.packmind.com'] },
          userEmail: 'someone@sub.packmind.com',
        });

        expect(isEnabled).toBe(false);
      });
    });
  });

  describe('when the email is malformed', () => {
    it('returns false for an email with no @', () => {
      const isEnabled = isFeatureFlagEnabled({
        featureKeys: ['featureA'],
        featureDomainMap,
        userEmail: 'not-an-email',
      });

      expect(isEnabled).toBe(false);
    });

    it('returns false for an email ending in @', () => {
      const isEnabled = isFeatureFlagEnabled({
        featureKeys: ['featureA'],
        featureDomainMap,
        userEmail: 'user@',
      });

      expect(isEnabled).toBe(false);
    });
  });

  describe('when the feature key is absent from the map', () => {
    it('returns false', () => {
      const isEnabled = isFeatureFlagEnabled({
        featureKeys: ['unknown-feature'],
        featureDomainMap,
        userEmail: 'user@packmind.com',
      });

      expect(isEnabled).toBe(false);
    });
  });

  describe('when multiple feature keys are provided', () => {
    it('returns true if any key allows the user', () => {
      const isEnabled = isFeatureFlagEnabled({
        featureKeys: ['unknown-feature', 'featureA'],
        featureDomainMap,
        userEmail: 'user@example.com',
      });

      expect(isEnabled).toBe(true);
    });
  });
});
