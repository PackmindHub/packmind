import { SpanStatusCode } from '@opentelemetry/api';
import { DomainError } from '@packmind/types';
import { withSpan } from './withSpan';

class DeniedTestError extends DomainError {
  readonly kind = 'forbidden' as const;
  readonly reason = 'test_denied';

  constructor() {
    super('the caller may not do that');
  }
}

describe('withSpan', () => {
  afterEach(() => jest.clearAllMocks());

  it('resolves with the callback result', async () => {
    await expect(withSpan('operation', async () => 'result')).resolves.toBe(
      'result',
    );
  });

  it('ends the span once the callback resolves', async () => {
    let end: jest.SpyInstance | undefined;

    await withSpan('operation', async (span) => {
      end = jest.spyOn(span, 'end');
    });

    expect(end).toHaveBeenCalledTimes(1);
  });

  describe('when the callback rejects', () => {
    const failure = new Error('the callback blew up');
    let recordException: jest.SpyInstance;
    let setStatus: jest.SpyInstance;
    let end: jest.SpyInstance;

    beforeEach(async () => {
      try {
        await withSpan('operation', async (span) => {
          recordException = jest.spyOn(span, 'recordException');
          setStatus = jest.spyOn(span, 'setStatus');
          end = jest.spyOn(span, 'end');
          throw failure;
        });
      } catch {
        // The rejection itself is asserted in its own test below.
      }
    });

    it('rethrows the error', async () => {
      await expect(
        withSpan('operation', async () => {
          throw failure;
        }),
      ).rejects.toThrow(failure);
    });

    it('records the exception on the span', () => {
      expect(recordException).toHaveBeenCalledWith(failure);
    });

    it('marks the span as failed', () => {
      expect(setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'the callback blew up',
      });
    });

    it('ends the span', () => {
      expect(end).toHaveBeenCalledTimes(1);
    });
  });

  // A permission denial is an expected outcome, not a fault. It used to mark
  // its span ERROR exactly as a crash did, so ordinary denials degraded the
  // service's error ratio in Tempo.
  describe('when the callback rejects with a domain error', () => {
    const denial = new DeniedTestError();
    let recordException: jest.SpyInstance;
    let setStatus: jest.SpyInstance;
    let end: jest.SpyInstance;

    beforeEach(async () => {
      try {
        await withSpan('operation', async (span) => {
          recordException = jest.spyOn(span, 'recordException');
          setStatus = jest.spyOn(span, 'setStatus');
          end = jest.spyOn(span, 'end');
          throw denial;
        });
      } catch {
        // Asserted in its own test below.
      }
    });

    it('rethrows the error', async () => {
      await expect(
        withSpan('operation', async () => {
          throw denial;
        }),
      ).rejects.toThrow(denial);
    });

    it('still records the exception on the span', () => {
      expect(recordException).toHaveBeenCalledWith(denial);
    });

    it('does not mark the span as failed', () => {
      expect(setStatus).not.toHaveBeenCalled();
    });

    it('ends the span', () => {
      expect(end).toHaveBeenCalledTimes(1);
    });
  });
});
