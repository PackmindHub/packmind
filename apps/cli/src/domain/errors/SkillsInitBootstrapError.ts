/**
 * Error thrown when `packmind-cli skills init` cannot bootstrap a fresh
 * directory (both packmind.json and packmind-lock.json absent) because the
 * organization's render-mode configuration could not be determined — either
 * because the call to the deployment gateway failed, or because the org
 * has zero render modes that map to a CodingAgent.
 *
 * The CLI handler is expected to print the directive message to stderr and
 * exit with code 1 so the user is pointed at the interactive `packmind init`
 * flow instead of being left with a silent no-op install.
 */
export class SkillsInitBootstrapError extends Error {
  public readonly isSkillsInitBootstrapError = true;

  constructor() {
    super(
      "Couldn't determine your organization's coding agents. Run `packmind init` to configure them interactively.",
    );
    this.name = 'SkillsInitBootstrapError';
  }
}

export function isSkillsInitBootstrapError(
  tbd: unknown,
): tbd is SkillsInitBootstrapError {
  return (tbd as SkillsInitBootstrapError).isSkillsInitBootstrapError;
}
