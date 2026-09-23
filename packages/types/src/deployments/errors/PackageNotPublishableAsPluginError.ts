import { DeploymentsError } from './DeploymentsError';

/**
 * The package carries no skills and no commands. Standards are not rendered
 * into a plugin, so a standards-only package is as unpublishable as an empty
 * one.
 *
 * `conflict` rather than `invalid_input`: the request is well-formed, and it
 * is the current contents of the package that rule the publish out.
 *
 * Raised on the backend render paths rather than trusted to the publish UI's
 * gate, so a direct API call cannot push an empty, manifest-only plugin onto
 * a marketplace.
 */
export class PackageNotPublishableAsPluginError extends DeploymentsError {
  constructor(
    public readonly packageSlug: string,
    public readonly packageName: string,
  ) {
    super(
      'conflict',
      'package_not_publishable_as_plugin',
      { packageSlug },
      `Cannot publish: package "${packageName}" has no skill or command. A marketplace plugin needs at least one skill or command — standards alone are not enough.`,
    );
    this.name = 'PackageNotPublishableAsPluginError';
  }
}
