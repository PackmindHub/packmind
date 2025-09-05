import {
  isPackmindError,
  PackmindError,
  ServerErrorResponse,
} from './PackmindError';

export class PackmindConflictError extends PackmindError {
  constructor(
    public readonly serverError: ServerErrorResponse,
    public readonly name = 'PackmindConflictError',
  ) {
    super(serverError, name);
    Object.setPrototypeOf(this, PackmindConflictError.prototype);
  }
}

export function isPackmindConflictError(
  tbd: unknown,
): tbd is PackmindConflictError {
  return isPackmindError(tbd) && tbd.serverError.status === 409;
}
