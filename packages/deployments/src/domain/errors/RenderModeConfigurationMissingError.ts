import { DeploymentsInternalError } from './DeploymentsInternalError';

/**
 * The configuration was read moments ago and is gone by the time the update
 * runs.
 *
 * Not a 404: the caller's own use case creates the configuration when the
 * first read finds none, so reaching this means it disappeared between the
 * two calls. There is nothing the caller can send to make that not happen.
 */
export class RenderModeConfigurationMissingError extends DeploymentsInternalError {
  constructor(organizationId: string) {
    super(
      'render_mode_configuration_missing',
      { organizationId },
      `Render mode configuration for organization ${organizationId} vanished between the read and the update`,
    );
    this.name = 'RenderModeConfigurationMissingError';
  }
}
