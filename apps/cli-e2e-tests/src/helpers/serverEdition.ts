import { editionFromDeploymentValue, PackmindEdition } from '@packmind/types';

/**
 * The edition the stack under test runs, resolved with the API's own rule so
 * the guard and the server cannot disagree.
 *
 * Read from the environment rather than fetched because the guard runs while
 * Jest collects suites, which is synchronous. Specs written for one edition
 * assert the server publishes it, so a stack that disagrees still fails loudly
 * instead of silently testing the wrong thing.
 */
export function getServerEdition(): PackmindEdition {
  return editionFromDeploymentValue(process.env['PACKMIND_EDITION']);
}
