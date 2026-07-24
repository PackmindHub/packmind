import { Type } from 'cmd-ts';
import { GitProviderVendor } from '@packmind/types';

// Validates the --type option of `git connection add`, accepting only the
// provider vendors the CLI can create with a token.
export const GitProviderType: Type<string, GitProviderVendor> = {
  from: async (input) => {
    const normalized = input.trim().toLowerCase();
    if (normalized === 'github' || normalized === 'gitlab') {
      return normalized;
    }
    throw new Error(
      `Invalid provider type "${input}". Supported types: github, gitlab.`,
    );
  },
};
