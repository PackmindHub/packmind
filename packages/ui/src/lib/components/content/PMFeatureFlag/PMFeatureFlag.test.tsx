import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  DEFAULT_FEATURE_DOMAIN_MAP,
  PMFeatureFlag,
  RULE_DETAILS_DETECTION_TAB_FEATURE_KEY,
  isFeatureFlagEnabled,
} from './PMFeatureFlag';
import { UIProvider } from '../../../UIProvider';

const renderWithProvider = (ui: React.ReactElement) =>
  render(<UIProvider>{ui}</UIProvider>);

describe('PMFeatureFlag', () => {
  const featureDomainMap = {
    featureA: ['packmind.com', 'example.com'],
    featureB: ['@packmind.com'],
  };

  describe('when email domain matches configured feature', () => {
    it('renders children', () => {
      renderWithProvider(
        <PMFeatureFlag
          featureKeys={['featureA']}
          featureDomainMap={featureDomainMap}
          userEmail="user@packmind.com"
        >
          <div>Visible content</div>
        </PMFeatureFlag>,
      );

      expect(screen.getByText('Visible content')).toBeInTheDocument();
    });
  });

  describe('when email domain is not configured', () => {
    it('returns null', () => {
      renderWithProvider(
        <PMFeatureFlag
          featureKeys={['featureA']}
          featureDomainMap={featureDomainMap}
          userEmail="user@restricted.com"
        >
          <div>Hidden content</div>
        </PMFeatureFlag>,
      );

      expect(screen.queryByText('Hidden content')).toBeNull();
    });
  });

  describe('when feature keys array is empty', () => {
    it('renders children', () => {
      renderWithProvider(
        <PMFeatureFlag
          featureKeys={[]}
          featureDomainMap={featureDomainMap}
          userEmail="user@restricted.com"
        >
          <div>Always visible content</div>
        </PMFeatureFlag>,
      );

      expect(screen.getByText('Always visible content')).toBeInTheDocument();
    });
  });

  describe('when user email is missing', () => {
    it('returns null', () => {
      renderWithProvider(
        <PMFeatureFlag
          featureKeys={['featureA']}
          featureDomainMap={featureDomainMap}
        >
          <div>Requires email</div>
        </PMFeatureFlag>,
      );

      expect(screen.queryByText('Requires email')).toBeNull();
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

  it('enables the detection tab feature for allowed domains', () => {
    const isEnabled = isFeatureFlagEnabled({
      featureKeys: [RULE_DETAILS_DETECTION_TAB_FEATURE_KEY],
      featureDomainMap: DEFAULT_FEATURE_DOMAIN_MAP,
      userEmail: 'member@promyze.com',
    });

    expect(isEnabled).toBe(true);
  });
});
