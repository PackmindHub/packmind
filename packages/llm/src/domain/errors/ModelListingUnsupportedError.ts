import { LlmError } from '@packmind/types';

/**
 * A provider whose deployments cannot be enumerated through its API. The
 * caller cannot fix this by retrying or reconfiguring through the app - the
 * deployment names must be set up out of band - so it is a 400, not a 500.
 */
export class ModelListingUnsupportedError extends LlmError {
  constructor(provider: string, message: string) {
    super('invalid_input', 'model_listing_unsupported', { provider }, message);
    this.name = 'ModelListingUnsupportedError';
  }
}
