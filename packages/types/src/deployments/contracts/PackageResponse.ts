import { Command, CommandId } from '../../commands';
import { Package, PackageWithArtefacts } from '../Package';

/**
 * Wire DTO for HTTP responses that carry a persisted {@link Package}.
 *
 * SUPERSET for the recipes→commands rename: it keeps the existing
 * recipe-named `recipes` field AND adds a command-named twin `commands`
 * carrying the same value. Old clients keep reading `recipes`; new clients
 * read `commands`. The persisted `Package` entity is never modified — the
 * twin is added at the controller boundary.
 */
export type PackageResponse = Package & {
  commands: CommandId[];
};

/**
 * Wire DTO for HTTP responses that carry a hydrated
 * {@link PackageWithArtefacts}. Same superset rule as {@link PackageResponse},
 * but the twin holds the full {@link Command} objects.
 */
export type PackageWithArtefactsResponse = PackageWithArtefacts & {
  commands: Command[];
};
