// The canonical definition lives in @packmind/types so cross-domain consumers
// don't reach into the deployments source. Re-exported here for the many
// in-domain callers (and the @packmind/deployments barrel).
export { parsePackageSlug } from '@packmind/types';
