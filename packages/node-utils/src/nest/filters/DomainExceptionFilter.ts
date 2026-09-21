import {
  ArgumentsHost,
  Catch,
  HttpServer,
  HttpStatus,
  Optional,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { PackmindLogger } from '@packmind/logger';
import {
  DomainErrorKind,
  isDomainError,
  isInternalError,
  isUpstreamError,
  UpstreamErrorKind,
} from '@packmind/types';

const origin = 'DomainExceptionFilter';

type KindPolicy = {
  readonly status: number;
  readonly logLevel: 'warn';
};

/**
 * What each kind is answered with, and how loudly it is recorded — the policy
 * table the domain errors are named after.
 *
 * Total by construction: a `Record` keyed by the union means a new
 * `DomainErrorKind` fails to compile until its row is stated here. No index
 * signature, no optional value and no default branch, on purpose.
 *
 * Every row logs at `warn`: a domain error is an expected answer, so it is not
 * worth an `error`, and it is worth more than nothing. `logLevel` is typed as
 * the single literal rather than the logger's full range, so widening it is a
 * deliberate edit here and not a value a row can quietly pick.
 */
const KIND_POLICY: Record<DomainErrorKind, KindPolicy> = {
  forbidden: { status: HttpStatus.FORBIDDEN, logLevel: 'warn' },
  not_found: { status: HttpStatus.NOT_FOUND, logLevel: 'warn' },
  invalid_input: { status: HttpStatus.BAD_REQUEST, logLevel: 'warn' },
  conflict: { status: HttpStatus.CONFLICT, logLevel: 'warn' },
};

/**
 * What each upstream kind is answered with — the same construction as
 * `KIND_POLICY`, and total for the same reason: a new `UpstreamErrorKind`
 * fails to compile until its row is stated here.
 *
 * Both rows log at `warn`, not `error`: a third party being down or throttling
 * us is not our invariant breaking, and an `error` here would drown the ones
 * that are. The statuses are the point of the type — `upstream_unavailable`
 * answers 502 rather than 503 because it is the thing behind us that failed,
 * and `upstream_rate_limited` answers 429 even though a 4xx normally means the
 * caller erred: they did not, our shared credential hit someone else's quota.
 */
const UPSTREAM_KIND_POLICY: Record<UpstreamErrorKind, KindPolicy> = {
  upstream_unavailable: { status: HttpStatus.BAD_GATEWAY, logLevel: 'warn' },
  upstream_rate_limited: {
    status: HttpStatus.TOO_MANY_REQUESTS,
    logLevel: 'warn',
  },
};

type HttpResponse = {
  status: (code: number) => { json: (body: unknown) => void };
  /**
   * Optional, and called defensively below: this is a minimal structural type
   * standing in for whatever the adapter hands us, and a response object
   * without `setHeader` must still get its body.
   */
  setHeader?: (name: string, value: string) => void;
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
 * Answers a domain or upstream error with the HTTP status its `kind` implies,
 * logs an internal error with its structured context, and hands
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
      const { status: statusCode, logLevel } = KIND_POLICY[exception.kind];
      const body: ErrorResponseBody = {
        statusCode,
        message:
          exception instanceof Error ? exception.message : exception.reason,
        reason: exception.reason,
      };

      this.logger[logLevel]('Domain error mapped to HTTP response', {
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

    if (isUpstreamError(exception)) {
      const { status: statusCode, logLevel } =
        UPSTREAM_KIND_POLICY[exception.kind];
      const body: ErrorResponseBody = {
        statusCode,
        message: exception.message,
        reason: exception.reason,
      };

      this.logger[logLevel]('Upstream error mapped to HTTP response', {
        statusCode,
        kind: exception.kind,
        reason: exception.reason,
        ...(hasContext(exception) ? { context: exception.context } : {}),
        ...(exception.retryAfterSeconds !== undefined
          ? { retryAfterSeconds: exception.retryAfterSeconds }
          : {}),
      });

      const response = host.switchToHttp().getResponse<HttpResponse>();

      // The message is shown here, unlike an internal error: "GitHub is rate
      // limiting us, try again shortly" is what the caller needs, and it
      // discloses nothing.
      if (exception.retryAfterSeconds !== undefined) {
        response.setHeader?.(
          'Retry-After',
          String(exception.retryAfterSeconds),
        );
      }

      response.status(statusCode).json(body);
      return;
    }

    if (isInternalError(exception)) {
      // Logged here and answered by `BaseExceptionFilter` below: the structured
      // `context` only reaches the log if something reads it off the error,
      // while the 500 body stays Nest's generic one, so nothing in `message`
      // or `context` is shown to the caller.
      this.logger.error('Internal error', {
        reason: exception.reason,
        message: exception.message,
        stack: exception.stack,
        ...(exception.context ? { context: exception.context } : {}),
      });
    }

    super.catch(exception, host);
  }
}
