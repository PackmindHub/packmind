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
  /**
   * When the row was written, and when it last changed, as the entity carries
   * them.
   *
   * Every response has held them since the table was written - both columns
   * come from `timestampsSchemas` and the controller sends the entity - and no
   * type said so, so a reader had to know that and cast. Declared here rather
   * than on `Package` because the persisted entity type is what the schema
   * intersects with `WithTimestamps`, which types them as `Date`; on the wire
   * they are strings.
   *
   * Optional because the frontend also builds this shape by hand in fixtures,
   * and a surface that prints a date has to survive not having one anyway.
   */
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Wire DTO for HTTP responses that carry a hydrated
 * {@link PackageWithArtefacts}. Same superset rule as {@link PackageResponse},
 * but the twin holds the full {@link Command} objects.
 */
export type PackageWithArtefactsResponse = PackageWithArtefacts & {
  commands: Command[];
};
