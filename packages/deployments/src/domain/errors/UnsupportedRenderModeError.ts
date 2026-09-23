import { DeploymentsInternalError } from './DeploymentsInternalError';

/**
 * A render mode from the enum has no coding agent mapped to it.
 *
 * Not the caller's fault even though a mode names it: the argument is typed
 * as `RenderMode`, so reaching this means the mapping table gained a gap when
 * the enum gained a member — ours to fix, and invisible to whoever asked.
 */
export class UnsupportedRenderModeError extends DeploymentsInternalError {
  constructor(renderMode: string) {
    super(
      'unsupported_render_mode',
      { renderMode },
      `Render mode ${renderMode} has no coding agent mapped to it`,
    );
    this.name = 'UnsupportedRenderModeError';
  }
}
