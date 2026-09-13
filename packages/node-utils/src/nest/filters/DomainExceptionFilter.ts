import {
  ArgumentsHost,
  Catch,
  HttpServer,
  HttpStatus,
  Optional,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { PackmindLogger } from '@packmind/logger';
import { DomainErrorKind, isDomainError } from '@packmind/types';

const origin = 'DomainExceptionFilter';

/**
 * Total by construction: a `Record` keyed by the union means a new
 * `DomainErrorKind` fails to compile until its status is stated here. No index
 * signature, no optional value and no default branch, on purpose.
 */
const KIND_TO_STATUS: Record<DomainErrorKind, number> = {
  forbidden: HttpStatus.FORBIDDEN,
  not_found: HttpStatus.NOT_FOUND,
};

type HttpResponse = {
  status: (code: number) => { json: (body: unknown) => void };
};

type ErrorResponseBody = {
  statusCode: number;
  message: string;
  reason: string;
};

function hasContext(value: unknown): value is { context: unknown } {
  return typeof value === 'object' && value !== null && 'context' in value;
}

/**
 * Answers a domain error with the HTTP status its `kind` implies, and hands
 * every other exception to Nest's own `BaseExceptionFilter` rather than
 * reproducing it — so `http-errors` statuses (a 413 from body-parser's size
 * limit, say), the already-sent-headers guard a streamed response needs, and
 * the `ExceptionsHandler` log all stay Nest's, whatever Nest makes of them next.
 *
 * Deliberately not re-exported from `src/nest/index.ts` nor from the package
 * barrel: consumers compile node-utils from source with transforms that do not
 * all parse decorators, so `@Catch()` must stay reachable only through the
 * `@packmind/node-utils/filters` subpath.
 */
@Catch()
export class DomainExceptionFilter extends BaseExceptionFilter {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
    /**
     * `BaseExceptionFilter` takes the application ref here and falls back to the
     * `httpAdapterHost` it has injected as a property when it is absent, which
     * is what happens under Nest DI. Optional so DI leaves it undefined, and
     * settable so a unit spec can construct the filter directly.
     */
    @Optional() applicationRef?: HttpServer,
  ) {
    super(applicationRef);
  }

  override catch(exception: unknown, host: ArgumentsHost): void {
    if (isDomainError(exception)) {
      const statusCode = KIND_TO_STATUS[exception.kind];
      const body: ErrorResponseBody = {
        statusCode,
        message:
          exception instanceof Error ? exception.message : exception.reason,
        reason: exception.reason,
      };

      this.logger.warn('Domain error mapped to HTTP response', {
        statusCode,
        kind: exception.kind,
        reason: exception.reason,
        ...(hasContext(exception) ? { context: exception.context } : {}),
      });

      host
        .switchToHttp()
        .getResponse<HttpResponse>()
        .status(statusCode)
        .json(body);
      return;
    }

    super.catch(exception, host);
  }
}
