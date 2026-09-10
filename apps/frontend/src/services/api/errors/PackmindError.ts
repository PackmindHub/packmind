export type ServerErrorResponse = {
  data: {
    message: string;
    /**
     * Stable discriminator some endpoints add when one HTTP status covers
     * several distinct failures, so clients branch on a code instead of
     * matching on message text.
     */
    reason?: string;
  };
  status: number;
  statusText: string;
};

export class PackmindError extends Error {
  constructor(
    public readonly serverError: ServerErrorResponse,
    public readonly name = 'PackmindError',
  ) {
    super(serverError.data.message);
    Object.setPrototypeOf(this, PackmindError.prototype);
  }
}

export function isPackmindError(tbd: unknown): tbd is PackmindError {
  if (tbd === undefined || tbd === null) return false;
  const asError = tbd as PackmindError;

  return (
    typeof asError.name === 'string' &&
    isServerErrorResponse(asError.serverError)
  );
}

/**
 * The server answering "there is no such thing" rather than failing to answer.
 *
 * Worth its own predicate because it is not always a failure: an address can
 * name something that does not exist in the space being read, and the caller
 * that asked is usually the one that knows what to do about it.
 */
export function isPackmindNotFoundError(tbd: unknown): tbd is PackmindError {
  return isPackmindError(tbd) && tbd.serverError.status === 404;
}

export function isServerErrorResponse(
  tbd: unknown,
): tbd is ServerErrorResponse {
  if (tbd === undefined || tbd === null) return false;

  const asServerErrorResponse = tbd as ServerErrorResponse;
  return (
    typeof asServerErrorResponse.status === 'number' &&
    typeof asServerErrorResponse.statusText === 'string' &&
    typeof asServerErrorResponse.data === 'object' &&
    typeof asServerErrorResponse.data.message === 'string'
  );
}
