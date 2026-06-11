/**
 * Shared constants for the rolling "Packmind sync" pull request used by the
 * marketplace publish pipeline.
 *
 * Both the publish job (writer) and any read path that needs to detect a
 * Packmind-managed PR must reference these values rather than hard-coding the
 * literal strings — keeping title and branch in lockstep across surfaces.
 */
export const MARKETPLACE_SYNC_PR_TITLE = 'Packmind sync';
export const MARKETPLACE_SYNC_BRANCH = 'packmind/sync';
