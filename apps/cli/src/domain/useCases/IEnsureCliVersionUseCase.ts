/**
 * Command for {@link IEnsureCliVersionUseCase}.
 *
 * - `baseDirectory`: workspace directory containing `packmind-lock.json`.
 * - `currentCliVersion`: the running CLI version (verbatim, may contain a
 *   `-next` pre-release suffix). This is what gets written into the lockfile
 *   when the running CLI is newer than the recorded one.
 * - `includeBeta`: forwarded to the default-skills install when an upgrade
 *   is detected.
 */
export type IEnsureCliVersionCommand = {
  baseDirectory: string;
  currentCliVersion: string;
  includeBeta?: boolean;
};

/**
 * Discriminated-union outcome returned by {@link IEnsureCliVersionUseCase}.
 *
 * - `no-lockfile`: there is no `packmind-lock.json` at the base directory.
 * - `no-cli-version-recorded`: the lockfile exists but predates the
 *   `cliVersion` field.
 * - `match`: the running CLI matches the recorded `cliVersion`.
 * - `newer`: the running CLI is newer than the recorded version. The use
 *   case has triggered a default-skills install and rewritten the lockfile
 *   with the new `cliVersion`. `upgraded` is always `true`.
 * - `older`: the running CLI is older than the recorded version. No side
 *   effects were performed; callers are expected to surface a warning.
 */
export type EnsureCliVersionOutcome =
  | { kind: 'no-lockfile' }
  | { kind: 'no-cli-version-recorded' }
  | { kind: 'match' }
  | { kind: 'newer'; lockVersion: string; upgraded: true }
  | { kind: 'older'; lockVersion: string };

export interface IEnsureCliVersionUseCase {
  execute(command: IEnsureCliVersionCommand): Promise<EnsureCliVersionOutcome>;
}
