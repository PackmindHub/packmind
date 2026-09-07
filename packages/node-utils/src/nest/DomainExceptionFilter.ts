import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainError, DomainErrorKind, isDomainError } from '@packmind/types';
import { LogLevel, PackmindLogger } from '@packmind/logger';

const origin = 'DomainExceptionFilter';

/**
 * The single point where a semantic error kind becomes an HTTP status.
 *
 * `Record` rather than a partial map, so adding a member to `DomainErrorKind`
 * is a compile error here until it is given a status. That is the reason the
 * kind union starts small and grows per domain instead of being declared
 * speculatively up front.
 */
const STATUS_BY_KIND: Record<DomainErrorKind, HttpStatus> = {
  forbidden: HttpStatus.FORBIDDEN,
  not_found: HttpStatus.NOT_FOUND,
};

type ErrorBody = {
  statusCode: number;
  message: string;
  reason?: string;
  details?: Record<string, string | number | boolean>;
};

/**
 * Global exception filter translating domain errors into HTTP responses.
 *
 * Before this existed, `apps/api` had no filter at all, so NestJS fell back to
 * its default `ExceptionsHandler`: every exception that was not an
 * `HttpException` became a 500, logged at ERROR level with a full stack trace.
 * A correctly-detected permission denial was therefore indistinguishable from
 * a server fault — to the client, to the error-rate SLO, and to whoever was
 * on call.
 *
 * Registered as a bare `@Catch()` that branches internally rather than as a
 * `@Catch(DomainError)` filter sitting beside a catch-all. Nest resolves global
 * filters in reverse registration order and selects the first whose metatypes
 * match, with an empty `@Catch()` matching everything — so two filters would
 * make correct behaviour depend on position in a providers array, which is a
 * trap for whoever adds the third one. One filter has no ordering to get wrong.
 */
export class DomainExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    // Only HTTP. The same errors are raised inside BullMQ workers and domain
    // event listeners, where there is no response to write and swallowing the
    // throw would silently mark a failed job as succeeded.
    if (host.getType() !== 'http') {
      throw exception;
    }

    const response = host.switchToHttp().getResponse<Response>();

    // The SSE routes stream, so by the time anything fails the status line and
    // headers are long gone and `res.json()` would throw inside the error
    // handler. Closing the stream is the only signal left.
    if (response.headersSent) {
      response.end();
      return;
    }

    if (exception instanceof HttpException) {
      this.sendHttpException(response, exception);
      return;
    }

    if (isDomainError(exception)) {
      this.sendDomainError(response, exception);
      return;
    }

    this.sendUnknown(response, exception);
  }

  /**
   * Hand-rolled `ConflictException`/`NotFoundException` throws in the
   * controllers keep their exact current response. Passing them through rather
   * than re-deriving a body is what makes installing this filter a no-op for
   * everything that has not adopted `DomainError` yet.
   */
  private sendHttpException(response: Response, exception: HttpException) {
    response.status(exception.getStatus()).json(exception.getResponse());
  }

  private sendDomainError(response: Response, exception: DomainError) {
    const statusCode = STATUS_BY_KIND[exception.kind];

    // warn, not error: this is a legitimate outcome of a request, and no
    // stack trace is logged. The stack was the reason every permission denial
    // used to write user and organization UUIDs into the logs.
    this.logger.warn('Domain error returned to client', {
      statusCode,
      kind: exception.kind,
      reason: exception.reason,
      name: exception.name,
    });

    const body: ErrorBody = {
      statusCode,
      message: exception.message,
      reason: exception.reason,
    };

    if (exception.details) {
      body.details = exception.details;
    }

    response.status(statusCode).json(body);
  }

  /**
   * Unchanged from the NestJS default on purpose: the ~900 bare
   * `throw new Error(...)` calls still in the tree must keep behaving exactly
   * as they do today, so that adopting `DomainError` stays incremental. Once a
   * domain is annotated, whatever still reaches here is a genuine fault.
   */
  private sendUnknown(response: Response, exception: unknown) {
    this.logger.error('Unhandled exception', {
      error: exception instanceof Error ? exception.message : String(exception),
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    const body: ErrorBody = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}

// `Catch()(DomainExceptionFilter)` rather than `@Catch()` on the class.
//
// It is the same call with the same effect — the decorator only writes Nest's
// CATCH_WATERMARK and FILTER_CATCH_EXCEPTIONS metadata onto the constructor —
// but decorator *syntax* has to be parsed, and this file is reachable from
// `@packmind/node-utils`'s barrel, which most of the monorepo imports. SWC
// only parses decorators when told to, and the packages that consume this
// barrel are not told to: adding `@Catch()` here broke every test suite in
// `packages/spaces` with "Expression expected", and would have required
// turning decorator parsing on in the jest and swc config of each consuming
// package, several of which are under the OSS parity contract.
//
// Keeping the decorator out of the syntax keeps the blast radius at this one
// file. If this ever becomes a decorated class properly, it needs a subpath
// export so the barrel stops carrying it.
Catch()(DomainExceptionFilter);
