import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import { DomainErrorKind, isDomainError } from '@packmind/types';

const origin = 'DomainExceptionFilter';

/**
 * Nest's own body for an exception it does not recognise. Reproduced here so an
 * unannotated error keeps producing exactly what it produces today.
 */
const UNKNOWN_EXCEPTION_MESSAGE = 'Internal server error';

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
 * Answers a domain error with the HTTP status its `kind` implies, and leaves
 * everything else exactly as Nest handles it today.
 *
 * Deliberately not re-exported from `src/nest/index.ts` nor from the package
 * barrel: consumers compile node-utils from source with transforms that do not
 * all parse decorators, so `@Catch()` must stay reachable only through the
 * `@packmind/node-utils/filters` subpath.
 */
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<HttpResponse>();

    if (exception instanceof HttpException) {
      const nestBody = exception.getResponse();
      const body =
        typeof nestBody === 'object' && nestBody !== null
          ? nestBody
          : { statusCode: exception.getStatus(), message: nestBody };

      response.status(exception.getStatus()).json(body);
      return;
    }

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

      response.status(statusCode).json(body);
      return;
    }

    this.logger.error('Unhandled exception', {
      stack: exception instanceof Error ? exception.stack : undefined,
      message: exception instanceof Error ? exception.message : undefined,
    });

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: UNKNOWN_EXCEPTION_MESSAGE,
    });
  }
}
