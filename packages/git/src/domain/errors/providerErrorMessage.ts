type ProviderErrorBody = {
  message?: unknown;
  errors?: unknown;
  error?: unknown;
  error_description?: unknown;
};

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

// GitLab answers validation failures with `{ message: { field: [errors] } }`.
function fieldErrors(message: unknown): string | null {
  if (!message || typeof message !== 'object' || Array.isArray(message)) {
    return null;
  }
  const parts = Object.entries(message).map(([field, errors]) =>
    [field, Array.isArray(errors) ? errors.join(', ') : String(errors)].join(
      ' ',
    ),
  );
  return parts.length > 0 ? parts.join('; ') : null;
}

// GitHub lists the detail of a refusal in `errors`, beside a generic message.
function details(errors: unknown): string[] {
  if (!Array.isArray(errors)) {
    return [];
  }
  return errors
    .map((entry) =>
      asNonEmptyString(
        entry && typeof entry === 'object'
          ? (entry as { message?: unknown }).message
          : entry,
      ),
    )
    .filter((detail): detail is string => detail !== null);
}

function bodyMessage(body: ProviderErrorBody): string | null {
  const message = asNonEmptyString(body.message) ?? fieldErrors(body.message);
  if (message) {
    const extra = details(body.errors);
    return extra.length > 0 ? `${message}: ${extra.join('; ')}` : message;
  }
  return (
    asNonEmptyString(body.error_description) ?? asNonEmptyString(body.error)
  );
}

/**
 * What the git provider said when it refused a call, rather than the HTTP
 * client's "Request failed with status code 400". The provider's words are
 * what tell a user which of their own settings — a push rule, a protected
 * branch, a ruleset — blocked the call.
 */
export function providerErrorMessage(cause: unknown): string {
  if (cause && typeof cause === 'object' && 'response' in cause) {
    const data = (cause as { response?: { data?: unknown } }).response?.data;
    if (data && typeof data === 'object') {
      const message = bodyMessage(data as ProviderErrorBody);
      if (message) {
        return message;
      }
    }
  }
  return cause instanceof Error ? cause.message : String(cause);
}

export function statusOf(cause: unknown): number | undefined {
  if (cause && typeof cause === 'object' && 'response' in cause) {
    const status = (cause as { response?: { status?: unknown } }).response
      ?.status;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}
