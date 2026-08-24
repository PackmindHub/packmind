import { SpanStatusCode } from '@opentelemetry/api';
import { withSpan } from './withSpan';

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
});
