import { CommandId } from '../../commands';
import { Package } from '../Package';
/**
 * Wire DTO for HTTP responses carrying a persisted {@link Package}.
 *
 * A superset, for the recipes→commands rename: the inherited `recipes` field
 * stays for clients that still read it, and `commands` is a twin carrying the
 * same value. The persisted entity is untouched — the twin is added at the
 * controller boundary.
 */
export type PackageResponse = Package & {
  commands: CommandId[];
  /**
   * Declared here rather than on `Package` because `WithTimestamps` types these
   * as `Date`, while on the wire they are strings.
   *
   * Optional because the frontend also builds this shape by hand in fixtures,
   * so a surface that prints a date has to survive not having one.
   */
  createdAt?: string;
  updatedAt?: string;
};
