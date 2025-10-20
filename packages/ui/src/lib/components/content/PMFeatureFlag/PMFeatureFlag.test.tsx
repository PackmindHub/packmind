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

  it('renders children when email domain matches configured feature', () => {
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

  it('returns null when email domain is not configured', () => {
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

  it('renders children when feature keys array is empty', () => {
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

  it('returns null when user email is missing', () => {
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

  it('handles domains prefixed with @ when evaluating features', () => {
    const isEnabled = isFeatureFlagEnabled({
      featureKeys: ['featureB'],
      featureDomainMap,
      userEmail: 'user@packmind.com',
    });

    expect(isEnabled).toBe(true);
  });

  it('returns false when feature is not configured for the user domain', () => {
    const isEnabled = isFeatureFlagEnabled({
      featureKeys: ['featureB'],
      featureDomainMap,
      userEmail: 'user@promyze.com',
    });

    expect(isEnabled).toBe(false);
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
