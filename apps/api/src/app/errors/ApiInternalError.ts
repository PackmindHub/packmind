import { PackmindInternalError } from '@packmind/types';

export type ApiInternalErrorReason =
  | 'organization_not_found_in_token_after_check'
  | 'user_id_required_for_sse'
  | 'workos_not_configured'
  | 'github_app_slug_not_configured';

export type ApiInternalErrorContext = {
  organizationId?: string;
  userId?: string;
  provider?: string;
  connectionId?: string;
};

/**
 * Base for the API app broken invariants: server misconfiguration or impossible
 * code paths that indicate logic errors rather than user actions.
 *
 * The line between this and a domain error is fault: if the caller could have
 * avoided it by asking for something else, it is a domain error (400/403/404).
 * If the application logic is broken, it is this.
 */
export class ApiInternalError extends PackmindInternalError {
  constructor(
    reason: ApiInternalErrorReason,
    context: ApiInternalErrorContext,
    message: string,
  ) {
    super(reason, context, message);
    this.name = 'ApiInternalError';
  }
}
