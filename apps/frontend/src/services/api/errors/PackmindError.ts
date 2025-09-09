export type ServerErrorResponse = {
  data: {
    message: string;
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
