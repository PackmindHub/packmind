/**
 * Error thrown when a Packmind package cannot be published as a managed
 * marketplace plugin because it carries no publishable content — i.e. it has
 * no skills and no recipes (standards alone are not rendered into a plugin).
 *
 * Mirrors the frontend gate so a direct API call can't bypass the UI and push
 * an empty (manifest-only) plugin onto a marketplace.
 */
export class PackageNotPublishableAsPluginError extends Error {
  constructor(
    public readonly packageSlug: string,
    public readonly packageName: string,
  ) {
    super(
      `Cannot publish: package "${packageName}" contains only standards. A marketplace plugin needs at least one skill or recipe.`,
    );
    this.name = 'PackageNotPublishableAsPluginError';
  }
}
