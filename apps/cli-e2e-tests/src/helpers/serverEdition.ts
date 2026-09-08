import { PackmindEdition } from '@packmind/types';

/**
 * The edition the stack under test runs, read from the same variable the API
 * resolves its own edition from, so a guard here and the server agree.
 *
 * Read rather than fetched because the guard runs while Jest is collecting
 * suites, which is synchronous. Specs written for one edition assert the
 * server publishes it, so a stack that disagrees fails loudly instead of
 * silently testing the wrong thing.
 */
export function getServerEdition(): PackmindEdition {
  const raw = process.env['PACKMIND_EDITION'];

  return raw === 'proprietary' || raw === 'cloud' || raw === 'enterprise'
    ? 'enterprise'
    : 'community';
}
