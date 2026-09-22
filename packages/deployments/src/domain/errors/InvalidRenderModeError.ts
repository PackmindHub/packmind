import { DeploymentsError } from '@packmind/types';

/**
 * The command asked for a render mode that is not one this deployment accepts.
 *
 * Malformed on its face, independently of any stored state, so `invalid_input`.
 * The mode is named back to the caller because the caller supplied it.
 */
export class InvalidRenderModeError extends DeploymentsError {
  constructor(renderMode: string) {
    super(
      'invalid_input',
      'invalid_render_mode',
      { renderMode },
      `Invalid render mode provided: ${renderMode}`,
    );
    this.name = 'InvalidRenderModeError';
  }
}
