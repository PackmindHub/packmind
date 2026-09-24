import { isDomainError, isUpstreamError } from '../../errors';
import {
  MarketplaceAlreadyLinkedError,
  MarketplacePluginNameConflictError,
  MarketplaceVendorMismatchError,
  MarketplaceDriftHasPendingChangesError,
  PluginDistributionInvalidStateError,
  MarketplaceNotFoundError,
  PluginDistributionNotFoundError,
  MarketplaceDescriptorNotFoundError,
  MarketplaceDescriptorBadFormatError,
  MarketplaceDescriptorParseError,
  UnknownMarketplaceDescriptorError,
  MarketplaceUrlNotReachableError,
  GitProviderTokenInvalidError,
  MarketplaceRepositoryUnreachableError,
} from '.';
import {
  createMarketplaceDistributionId,
  createMarketplaceId,
  MarketplaceDistributionStatus,
} from '../index';

describe('MarketplaceAlreadyLinkedError', () => {
  const error = new MarketplaceAlreadyLinkedError('org', 'repo');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers conflict', () => {
    expect(error.kind).toBe('conflict');
  });

  it('has reason marketplace_already_linked', () => {
    expect(error.reason).toBe('marketplace_already_linked');
  });

  it('keeps owner and repo in context', () => {
    expect(error.context).toEqual({ gitRepoOwner: 'org', gitRepoName: 'repo' });
  });
});

describe('MarketplacePluginNameConflictError', () => {
  const error = new MarketplacePluginNameConflictError(
    'my-plugin',
    'MyMarketplace',
  );

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers conflict', () => {
    expect(error.kind).toBe('conflict');
  });

  it('has reason marketplace_plugin_name_conflict', () => {
    expect(error.reason).toBe('marketplace_plugin_name_conflict');
  });

  it('keeps pluginSlug and marketplaceName in context', () => {
    expect(error.context).toEqual({
      pluginSlug: 'my-plugin',
      marketplaceName: 'MyMarketplace',
    });
  });
});

describe('MarketplaceVendorMismatchError', () => {
  const error = new MarketplaceVendorMismatchError(
    'MyMarketplace',
    'promyze',
    'openforge',
  );

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers conflict', () => {
    expect(error.kind).toBe('conflict');
  });

  it('has reason vendor_mismatch', () => {
    expect(error.reason).toBe('vendor_mismatch');
  });

  it('keeps marketplace name and vendors in context', () => {
    expect(error.context).toEqual({
      marketplaceName: 'MyMarketplace',
      previousVendor: 'promyze',
      currentVendor: 'openforge',
    });
  });
});

describe('MarketplaceDriftHasPendingChangesError', () => {
  const error = new MarketplaceDriftHasPendingChangesError(3, 2);

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers conflict', () => {
    expect(error.kind).toBe('conflict');
  });

  it('has reason marketplace_drift_has_pending_changes', () => {
    expect(error.reason).toBe('marketplace_drift_has_pending_changes');
  });

  it('keeps pending counts in context', () => {
    expect(error.context).toEqual({
      pendingMergeCount: 3,
      pendingRemovalCount: 2,
    });
  });
});

describe('PluginDistributionInvalidStateError', () => {
  const distributionId = createMarketplaceDistributionId();
  const error = new PluginDistributionInvalidStateError(
    distributionId,
    MarketplaceDistributionStatus.in_progress,
    [
      MarketplaceDistributionStatus.success,
      MarketplaceDistributionStatus.pending_merge,
    ],
  );

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers conflict', () => {
    expect(error.kind).toBe('conflict');
  });

  it('has reason plugin_distribution_invalid_state', () => {
    expect(error.reason).toBe('plugin_distribution_invalid_state');
  });

  it('keeps distribution id in context', () => {
    expect(error.context.distributionId).toBe(distributionId);
  });

  it('keeps distribution status in context', () => {
    expect(error.context.distributionStatus).toBe('in_progress');
  });

  it('keeps expected statuses in context', () => {
    expect(error.context.expectedDistributionStatuses).toEqual([
      'success',
      'pending_merge',
    ]);
  });

  it('does not include distribution id in message', () => {
    expect(error.message).not.toContain(String(distributionId));
  });
});

describe('MarketplaceNotFoundError', () => {
  const marketplaceId = createMarketplaceId();
  const error = new MarketplaceNotFoundError(marketplaceId);

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers not_found', () => {
    expect(error.kind).toBe('not_found');
  });

  it('has reason marketplace_not_found', () => {
    expect(error.reason).toBe('marketplace_not_found');
  });

  it('keeps marketplace id in context', () => {
    expect(error.context).toEqual({ marketplaceId });
  });

  it('does not include id in message', () => {
    expect(error.message).not.toContain(String(marketplaceId));
  });
});

describe('PluginDistributionNotFoundError', () => {
  describe('when given a distribution id', () => {
    const distributionId = createMarketplaceDistributionId();
    const error = new PluginDistributionNotFoundError({ distributionId });

    it('is a domain error', () => {
      expect(isDomainError(error)).toBe(true);
    });

    it('answers not_found', () => {
      expect(error.kind).toBe('not_found');
    });

    it('has reason plugin_distribution_not_found', () => {
      expect(error.reason).toBe('plugin_distribution_not_found');
    });

    it('keeps distribution id in context', () => {
      expect(error.context).toEqual({ distributionId });
    });

    it('does not include distribution id in message', () => {
      expect(error.message).not.toContain(String(distributionId));
    });
  });

  describe('when given package and marketplace ids', () => {
    const error = new PluginDistributionNotFoundError({
      packageId: 'pkg-123',
      marketplaceId: 'mp-456',
    });

    it('is a domain error', () => {
      expect(isDomainError(error)).toBe(true);
    });

    it('answers not_found', () => {
      expect(error.kind).toBe('not_found');
    });

    it('keeps package and marketplace ids in context', () => {
      expect(error.context).toEqual({
        packageId: 'pkg-123',
        marketplaceId: 'mp-456',
      });
    });

    it('does not include the package id in message', () => {
      expect(error.message).not.toContain('pkg-123');
    });

    it('does not include the marketplace id in message', () => {
      expect(error.message).not.toContain('mp-456');
    });
  });
});

describe('MarketplaceDescriptorNotFoundError', () => {
  const error = new MarketplaceDescriptorNotFoundError('owner', 'repo');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers invalid_input', () => {
    expect(error.kind).toBe('invalid_input');
  });

  it('has reason marketplace_descriptor_not_found', () => {
    expect(error.reason).toBe('marketplace_descriptor_not_found');
  });

  it('keeps owner and repo in context', () => {
    expect(error.context).toEqual({
      gitRepoOwner: 'owner',
      gitRepoName: 'repo',
    });
  });
});

describe('MarketplaceDescriptorBadFormatError', () => {
  describe('without detail', () => {
    const error = new MarketplaceDescriptorBadFormatError('owner', 'repo');

    it('is a domain error', () => {
      expect(isDomainError(error)).toBe(true);
    });

    it('answers invalid_input', () => {
      expect(error.kind).toBe('invalid_input');
    });

    it('has reason marketplace_descriptor_bad_format', () => {
      expect(error.reason).toBe('marketplace_descriptor_bad_format');
    });

    it('keeps owner and repo in context', () => {
      expect(error.context).toEqual({
        gitRepoOwner: 'owner',
        gitRepoName: 'repo',
      });
    });
  });

  describe('with detail', () => {
    const error = new MarketplaceDescriptorBadFormatError(
      'owner',
      'repo',
      'missing field: name',
    );

    it('includes detail in message', () => {
      expect(error.message).toContain('missing field: name');
    });

    it('has detail field (renamed from reason)', () => {
      expect(error.detail).toBe('missing field: name');
    });
  });
});

describe('MarketplaceDescriptorParseError', () => {
  const cause = new SyntaxError('Unexpected token');
  const error = new MarketplaceDescriptorParseError(
    'Failed to parse descriptor',
    cause,
  );

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers invalid_input', () => {
    expect(error.kind).toBe('invalid_input');
  });

  it('has reason marketplace_descriptor_unparseable', () => {
    expect(error.reason).toBe('marketplace_descriptor_unparseable');
  });

  it('preserves the cause', () => {
    expect(error.cause).toBe(cause);
  });
});

describe('UnknownMarketplaceDescriptorError', () => {
  const error = new UnknownMarketplaceDescriptorError();

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers invalid_input', () => {
    expect(error.kind).toBe('invalid_input');
  });

  it('has reason unknown_marketplace_descriptor', () => {
    expect(error.reason).toBe('unknown_marketplace_descriptor');
  });
});

describe('MarketplaceUrlNotReachableError', () => {
  const url = 'https://example.com/marketplace';
  const error = new MarketplaceUrlNotReachableError(url);

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers invalid_input', () => {
    expect(error.kind).toBe('invalid_input');
  });

  it('has reason marketplace_url_not_reachable', () => {
    expect(error.reason).toBe('marketplace_url_not_reachable');
  });

  it('keeps url in context', () => {
    expect(error.context).toEqual({ marketplaceUrl: url });
  });

  it('includes url in message since it is caller-supplied', () => {
    expect(error.message).toContain(url);
  });
});

describe('GitProviderTokenInvalidError', () => {
  const error = new GitProviderTokenInvalidError();

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers invalid_input', () => {
    expect(error.kind).toBe('invalid_input');
  });

  it('has reason git_provider_token_invalid', () => {
    expect(error.reason).toBe('git_provider_token_invalid');
  });

  it('uses the USER_FACING_MESSAGE constant', () => {
    expect(error.message).toBe(
      GitProviderTokenInvalidError.USER_FACING_MESSAGE,
    );
  });
});

describe('MarketplaceRepositoryUnreachableError', () => {
  const error = new MarketplaceRepositoryUnreachableError('owner', 'repo');

  it('is an upstream error', () => {
    expect(isUpstreamError(error)).toBe(true);
  });

  it('answers upstream_unavailable', () => {
    expect(error.kind).toBe('upstream_unavailable');
  });

  it('has reason marketplace_repository_unreachable', () => {
    expect(error.reason).toBe('marketplace_repository_unreachable');
  });

  it('keeps owner and repo in context', () => {
    expect(error.context).toEqual({
      gitRepoOwner: 'owner',
      gitRepoName: 'repo',
    });
  });

  it('includes owner/repo in user-facing message', () => {
    expect(error.message).toContain('owner/repo');
  });
});
