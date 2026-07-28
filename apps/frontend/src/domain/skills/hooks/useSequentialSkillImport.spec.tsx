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
  afterEach(() => jest.clearAllMocks());

  describe('before anything is imported', () => {
    it('has no rows', () => {
      const { result } = renderHook(() =>
        useSequentialSkillImport({
          uploadSkill: jest.fn(),
          onFinished: jest.fn(),
        }),
      );

      expect(result.current.rows).toEqual([]);
    });

    it('is not importing', () => {
      const { result } = renderHook(() =>
        useSequentialSkillImport({
          uploadSkill: jest.fn(),
          onFinished: jest.fn(),
        }),
      );

      expect(result.current.isImporting).toBe(false);
    });
  });

  describe('when every skill uploads successfully', () => {
    it('uploads each skill once', async () => {
      const uploadSkill = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useSequentialSkillImport({ uploadSkill, onFinished: jest.fn() }),
      );

      await act(() => result.current.start([first, second]));

      expect(uploadSkill).toHaveBeenCalledTimes(2);
    });

    it('never runs two uploads at the same time', async () => {
      let inFlight = 0;
      let maxInFlight = 0;
      const uploadSkill = jest.fn(async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await Promise.resolve();
        inFlight -= 1;
      });
      const { result } = renderHook(() =>
        useSequentialSkillImport({ uploadSkill, onFinished: jest.fn() }),
      );

      await act(() => result.current.start([first, second]));

      expect(maxInFlight).toBe(1);
    });

    it('uploads them in the order they were given', async () => {
      const uploaded: string[] = [];
      const uploadSkill = jest.fn(async (skill: DetectedSkill) => {
        uploaded.push(skill.name);
      });
      const { result } = renderHook(() =>
        useSequentialSkillImport({ uploadSkill, onFinished: jest.fn() }),
      );

      await act(() => result.current.start([first, second]));

      expect(uploaded).toEqual(['documentation', 'onboarding']);
    });

    it('marks every row as successful', async () => {
      const { result } = renderHook(() =>
        useSequentialSkillImport({
          uploadSkill: jest.fn().mockResolvedValue(undefined),
          onFinished: jest.fn(),
        }),
      );

      await act(() => result.current.start([first, second]));

      expect(result.current.rows.map((row) => row.status)).toEqual([
        'success',
        'success',
      ]);
    });

    it('calls onFinished once for the whole batch', async () => {
      const onFinished = jest.fn();
      const { result } = renderHook(() =>
        useSequentialSkillImport({
          uploadSkill: jest.fn().mockResolvedValue(undefined),
          onFinished,
        }),
      );

      await act(() => result.current.start([first, second]));

      expect(onFinished).toHaveBeenCalledTimes(1);
    });

    it('stops reporting an import in progress', async () => {
      const { result } = renderHook(() =>
        useSequentialSkillImport({
          uploadSkill: jest.fn().mockResolvedValue(undefined),
          onFinished: jest.fn(),
        }),
      );

      await act(() => result.current.start([first, second]));

      expect(result.current.isImporting).toBe(false);
    });
  });

  describe('when one upload fails', () => {
    const buildHook = () => {
      const uploadSkill = jest
        .fn()
        .mockRejectedValueOnce(new Error('Invalid frontmatter'))
        .mockResolvedValueOnce(undefined);
      return renderHook(() =>
        useSequentialSkillImport({ uploadSkill, onFinished: jest.fn() }),
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
          uploadSkill: jest.fn().mockRejectedValue('boom'),
          onFinished: jest.fn(),
        }),
      );

      await act(() => result.current.start([first]));

      expect(result.current.rows[0].error).toBe('Upload failed');
    });
  });

  describe('when a skill already failed validation', () => {
    const invalid = detectedSkill('broken', 'SKILL.md is missing');

    it('does not send a request for it', async () => {
      const uploadSkill = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useSequentialSkillImport({ uploadSkill, onFinished: jest.fn() }),
      );

      await act(() => result.current.start([invalid]));

      expect(uploadSkill).not.toHaveBeenCalled();
    });

    it('reports the validation error on its row', async () => {
      const { result } = renderHook(() =>
        useSequentialSkillImport({
          uploadSkill: jest.fn().mockResolvedValue(undefined),
          onFinished: jest.fn(),
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
      const uploadSkill = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useSequentialSkillImport({ uploadSkill, onFinished: jest.fn() }),
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
          uploadSkill: jest.fn().mockReturnValue(gate.promise),
          onFinished: jest.fn(),
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
          uploadSkill: jest.fn().mockReturnValue(gate.promise),
          onFinished: jest.fn(),
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
      const uploadSkill = jest.fn().mockReturnValueOnce(gate.promise);
      const { result } = renderHook(() =>
        useSequentialSkillImport({ uploadSkill, onFinished: jest.fn() }),
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
      const onFinished = jest.fn();
      const { result } = renderHook(() =>
        useSequentialSkillImport({
          uploadSkill: jest.fn().mockReturnValueOnce(gate.promise),
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
          uploadSkill: jest.fn().mockResolvedValue(undefined),
          onFinished: jest.fn(),
        }),
      );

      await act(() => result.current.start([first]));
      await act(() => result.current.start([second]));

      expect(result.current.rows.map((row) => row.name)).toEqual([
        'onboarding',
      ]);
    });
  });

  describe('when the batch is empty', () => {
    it('calls onFinished without uploading anything', async () => {
      const uploadSkill = jest.fn();
      const { result } = renderHook(() =>
        useSequentialSkillImport({ uploadSkill, onFinished: jest.fn() }),
      );

      await act(() => result.current.start([]));

      expect(uploadSkill).not.toHaveBeenCalled();
    });
  });
});
