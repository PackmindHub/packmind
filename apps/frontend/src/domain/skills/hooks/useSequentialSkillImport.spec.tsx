import { act, renderHook } from '@testing-library/react';

import { DetectedSkill } from '../utils/collectSkillsFromFiles';
import { useSequentialSkillImport } from './useSequentialSkillImport';

function detectedSkill(name: string, validationError?: string): DetectedSkill {
  return {
    name,
    files: [{ relativePath: 'SKILL.md', file: new File(['x'], 'SKILL.md') }],
    totalSize: 1,
    validationError,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const first = detectedSkill('documentation');
const second = detectedSkill('onboarding');

describe('useSequentialSkillImport', () => {
  afterEach(() => vi.clearAllMocks());

  describe('before anything is imported', () => {
    it('has no rows', () => {
      const { result } = renderHook(() =>
        useSequentialSkillImport({
          uploadSkill: vi.fn(),
          onFinished: vi.fn(),
        }),
      );

      expect(result.current.rows).toEqual([]);
    });

    it('is not importing', () => {
      const { result } = renderHook(() =>
        useSequentialSkillImport({
          uploadSkill: vi.fn(),
          onFinished: vi.fn(),
        }),
      );

      expect(result.current.isImporting).toBe(false);
    });
  });

  describe('when every skill uploads successfully', () => {
    it('uploads each skill once', async () => {
      const uploadSkill = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useSequentialSkillImport({ uploadSkill, onFinished: vi.fn() }),
      );

      await act(() => result.current.start([first, second]));

      expect(uploadSkill).toHaveBeenCalledTimes(2);
    });

    it('never runs two uploads at the same time', async () => {
      let inFlight = 0;
      let maxInFlight = 0;
      const uploadSkill = vi.fn(async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await Promise.resolve();
        inFlight -= 1;
      });
      const { result } = renderHook(() =>
        useSequentialSkillImport({ uploadSkill, onFinished: vi.fn() }),
      );

      await act(() => result.current.start([first, second]));

      expect(maxInFlight).toBe(1);
    });

    it('uploads them in the order they were given', async () => {
      const uploaded: string[] = [];
      const uploadSkill = vi.fn(async (skill: DetectedSkill) => {
        uploaded.push(skill.name);
      });
      const { result } = renderHook(() =>
        useSequentialSkillImport({ uploadSkill, onFinished: vi.fn() }),
      );

      await act(() => result.current.start([first, second]));

      expect(uploaded).toEqual(['documentation', 'onboarding']);
    });

    it('marks every row as successful', async () => {
      const { result } = renderHook(() =>
        useSequentialSkillImport({
          uploadSkill: vi.fn().mockResolvedValue(undefined),
          onFinished: vi.fn(),
        }),
      );

      await act(() => result.current.start([first, second]));

      expect(result.current.rows.map((row) => row.status)).toEqual([
        'success',
        'success',
      ]);
    });

    it('calls onFinished once for the whole batch', async () => {
      const onFinished = vi.fn();
      const { result } = renderHook(() =>
        useSequentialSkillImport({
          uploadSkill: vi.fn().mockResolvedValue(undefined),
          onFinished,
        }),
      );

      await act(() => result.current.start([first, second]));

      expect(onFinished).toHaveBeenCalledTimes(1);
    });

    it('stops reporting an import in progress', async () => {
      const { result } = renderHook(() =>
        useSequentialSkillImport({
          uploadSkill: vi.fn().mockResolvedValue(undefined),
          onFinished: vi.fn(),
        }),
      );

      await act(() => result.current.start([first, second]));

      expect(result.current.isImporting).toBe(false);
    });
  });

  describe('when one upload fails', () => {
    const buildHook = () => {
      const uploadSkill = vi
        .fn()
        .mockRejectedValueOnce(new Error('Invalid frontmatter'))
        .mockResolvedValueOnce(undefined);
      return renderHook(() =>
        useSequentialSkillImport({ uploadSkill, onFinished: vi.fn() }),
      );
    };

    it('marks that skill as failed', async () => {
      const { result } = buildHook();

      await act(() => result.current.start([first, second]));

      expect(result.current.rows[0].status).toBe('failed');
    });

    it('surfaces the error message on that row', async () => {
      const { result } = buildHook();

      await act(() => result.current.start([first, second]));

      expect(result.current.rows[0].error).toBe('Invalid frontmatter');
    });

    it('still imports the skills that come after it', async () => {
      const { result } = buildHook();

      await act(() => result.current.start([first, second]));

      expect(result.current.rows[1].status).toBe('success');
    });
  });

  describe('when an upload rejects with something that is not an Error', () => {
    it('falls back to a generic message', async () => {
      const { result } = renderHook(() =>
        useSequentialSkillImport({
          uploadSkill: vi.fn().mockRejectedValue('boom'),
          onFinished: vi.fn(),
        }),
      );

      await act(() => result.current.start([first]));

      expect(result.current.rows[0].error).toBe('Upload failed');
    });
  });

  describe('when a skill already failed validation', () => {
    const invalid = detectedSkill('broken', 'SKILL.md is missing');

    it('does not send a request for it', async () => {
      const uploadSkill = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useSequentialSkillImport({ uploadSkill, onFinished: vi.fn() }),
      );

      await act(() => result.current.start([invalid]));

      expect(uploadSkill).not.toHaveBeenCalled();
    });

    it('reports the validation error on its row', async () => {
      const { result } = renderHook(() =>
        useSequentialSkillImport({
          uploadSkill: vi.fn().mockResolvedValue(undefined),
          onFinished: vi.fn(),
        }),
      );

      await act(() => result.current.start([invalid]));

      expect(result.current.rows[0]).toEqual({
        name: 'broken',
        status: 'failed',
        error: 'SKILL.md is missing',
      });
    });

    it('still uploads the valid skills of the batch', async () => {
      const uploadSkill = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useSequentialSkillImport({ uploadSkill, onFinished: vi.fn() }),
      );

      await act(() => result.current.start([invalid, first]));

      expect(uploadSkill).toHaveBeenCalledTimes(1);
    });
  });

  describe('while an import is running', () => {
    it('reports that it is importing', async () => {
      const gate = deferred<void>();
      const { result } = renderHook(() =>
        useSequentialSkillImport({
          uploadSkill: vi.fn().mockReturnValue(gate.promise),
          onFinished: vi.fn(),
        }),
      );

      let running!: Promise<void>;
      await act(async () => {
        running = result.current.start([first]);
        await Promise.resolve();
      });

      expect(result.current.isImporting).toBe(true);

      gate.resolve();
      await act(() => running);
    });

    it('marks the skill being uploaded as uploading', async () => {
      const gate = deferred<void>();
      const { result } = renderHook(() =>
        useSequentialSkillImport({
          uploadSkill: vi.fn().mockReturnValue(gate.promise),
          onFinished: vi.fn(),
        }),
      );

      let running!: Promise<void>;
      await act(async () => {
        running = result.current.start([first, second]);
        await Promise.resolve();
      });

      expect(result.current.rows.map((row) => row.status)).toEqual([
        'uploading',
        'pending',
      ]);

      gate.resolve();
      await act(() => running);
    });

    it('ignores a second start so the batches cannot interleave', async () => {
      const gate = deferred<void>();
      const uploadSkill = vi.fn().mockReturnValueOnce(gate.promise);
      const { result } = renderHook(() =>
        useSequentialSkillImport({ uploadSkill, onFinished: vi.fn() }),
      );

      let running!: Promise<void>;
      await act(async () => {
        running = result.current.start([first]);
        await Promise.resolve();
      });
      await act(() => result.current.start([second]));

      expect(result.current.rows.map((row) => row.name)).toEqual([
        'documentation',
      ]);

      gate.resolve();
      await act(() => running);
    });

    it('does not call onFinished for the ignored start', async () => {
      const gate = deferred<void>();
      const onFinished = vi.fn();
      const { result } = renderHook(() =>
        useSequentialSkillImport({
          uploadSkill: vi.fn().mockReturnValueOnce(gate.promise),
          onFinished,
        }),
      );

      let running!: Promise<void>;
      await act(async () => {
        running = result.current.start([first]);
        await Promise.resolve();
      });
      await act(() => result.current.start([second]));

      expect(onFinished).not.toHaveBeenCalled();

      gate.resolve();
      await act(() => running);
    });
  });

  describe('when a second batch is imported after the first finished', () => {
    it('replaces the rows with the new batch', async () => {
      const { result } = renderHook(() =>
        useSequentialSkillImport({
          uploadSkill: vi.fn().mockResolvedValue(undefined),
          onFinished: vi.fn(),
        }),
      );

      await act(() => result.current.start([first]));
      await act(() => result.current.start([second]));

      expect(result.current.rows.map((row) => row.name)).toEqual([
        'onboarding',
      ]);
    });
  });

  describe('when the rows are reset', () => {
    it('drops the results of the previous batch', async () => {
      const { result } = renderHook(() =>
        useSequentialSkillImport({
          uploadSkill: vi.fn().mockResolvedValue(undefined),
          onFinished: vi.fn(),
        }),
      );

      await act(() => result.current.start([first]));
      act(() => result.current.reset());

      expect(result.current.rows).toEqual([]);
    });
  });

  describe('when the import is cancelled mid-batch', () => {
    const third = detectedSkill('deployment');

    /**
     * The first skill goes through, the second hangs until its signal aborts —
     * which is what a real request does — and the third never gets a turn.
     */
    const buildHook = () => {
      const signals: AbortSignal[] = [];
      // Keyed by skill rather than by call count, so a later batch reusing this
      // mock is not left waiting on an abort that is never coming.
      const uploadSkill = vi.fn((skill: DetectedSkill, signal: AbortSignal) => {
        signals.push(signal);
        if (skill.name !== second.name) return Promise.resolve();
        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('canceled')));
        });
      });
      const onFinished = vi.fn();
      const hook = renderHook(() =>
        useSequentialSkillImport({ uploadSkill, onFinished }),
      );
      return { ...hook, uploadSkill, onFinished, signals };
    };

    const runUntilCancelled = async (hook: ReturnType<typeof buildHook>) => {
      let running!: Promise<void>;
      await act(async () => {
        running = hook.result.current.start([first, second, third]);
        await Promise.resolve();
        await Promise.resolve();
      });
      await act(async () => {
        hook.result.current.cancel();
        await running;
      });
    };

    it('leaves the skill that already went through imported', async () => {
      const hook = buildHook();

      await runUntilCancelled(hook);

      expect(hook.result.current.rows[0].status).toBe('success');
    });

    it('marks the upload that was in flight as cancelled', async () => {
      const hook = buildHook();

      await runUntilCancelled(hook);

      expect(hook.result.current.rows[1].status).toBe('cancelled');
    });

    it('marks the skills still queued as cancelled', async () => {
      const hook = buildHook();

      await runUntilCancelled(hook);

      expect(hook.result.current.rows[2].status).toBe('cancelled');
    });

    // An abort is not this skill's fault, and reporting it as one would send
    // the user looking for a problem with the file.
    it('does not report the aborted upload as failed', async () => {
      const hook = buildHook();

      await runUntilCancelled(hook);

      expect(hook.result.current.rows[1].error).toBeUndefined();
    });

    it('does not start the uploads that were still queued', async () => {
      const hook = buildHook();

      await runUntilCancelled(hook);

      expect(hook.uploadSkill).toHaveBeenCalledTimes(2);
    });

    it('aborts the signal handed to the upload in flight', async () => {
      const hook = buildHook();

      await runUntilCancelled(hook);

      expect(hook.signals[1].aborted).toBe(true);
    });

    it('stops reporting an import in progress', async () => {
      const hook = buildHook();

      await runUntilCancelled(hook);

      expect(hook.result.current.isImporting).toBe(false);
    });

    // Whatever was imported before the cancellation is on the server, so the
    // list behind the panel is stale just as it would be after a full run.
    it('still calls onFinished', async () => {
      const hook = buildHook();

      await runUntilCancelled(hook);

      expect(hook.onFinished).toHaveBeenCalledTimes(1);
    });

    it('lets a fresh batch start afterwards', async () => {
      const hook = buildHook();
      await runUntilCancelled(hook);

      await act(() => hook.result.current.start([first]));

      expect(hook.result.current.rows.map((row) => row.name)).toEqual([
        'documentation',
      ]);
    });
  });

  describe('when cancel is called with no import running', () => {
    it('does nothing', () => {
      const { result } = renderHook(() =>
        useSequentialSkillImport({
          uploadSkill: vi.fn(),
          onFinished: vi.fn(),
        }),
      );

      expect(() => act(() => result.current.cancel())).not.toThrow();
    });
  });

  describe('when the batch is empty', () => {
    it('calls onFinished without uploading anything', async () => {
      const uploadSkill = vi.fn();
      const { result } = renderHook(() =>
        useSequentialSkillImport({ uploadSkill, onFinished: vi.fn() }),
      );

      await act(() => result.current.start([]));

      expect(uploadSkill).not.toHaveBeenCalled();
    });
  });
});
