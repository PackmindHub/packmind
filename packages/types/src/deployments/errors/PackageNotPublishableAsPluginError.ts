/**
 * Error thrown when a Packmind package cannot be published as a managed
 * marketplace plugin because it carries no publishable content — i.e. it has
 * no skills and no commands (standards alone are not rendered into a plugin,
 * so a standards-only package is as unpublishable as an empty one).
 *
 * Enforced on every backend render path — the synchronous publish use case,
 * the publish job, and the CLI render endpoint — so a direct API call can't
 * bypass the marketplace publish UI's gate and push an empty (manifest-only)
 * plugin onto a marketplace.
 */
export class PackageNotPublishableAsPluginError extends Error {
  constructor(
    public readonly packageSlug: string,
    public readonly packageName: string,
  ) {
    super(
      `Cannot publish: package "${packageName}" has no skill or command. A marketplace plugin needs at least one skill or command — standards alone are not enough.`,
    );
    this.name = 'PackageNotPublishableAsPluginError';
  }
}
