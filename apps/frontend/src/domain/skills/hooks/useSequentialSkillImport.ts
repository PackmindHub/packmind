import { useCallback, useRef, useState } from 'react';

import { DetectedSkill } from '../utils/collectSkillsFromFiles';

export type ImportRowStatus =
  | 'pending'
  | 'uploading'
  | 'success'
  | 'failed'
  | 'cancelled';

export type ImportRow = {
  name: string;
  status: ImportRowStatus;
  error?: string;
};

type UploadSkillFn = (
  skill: DetectedSkill,
  signal: AbortSignal,
) => Promise<unknown>;

type UseSequentialSkillImportParams = {
  uploadSkill: UploadSkillFn;
  /** Called once the whole batch has settled — where the caller invalidates the skills list. */
  onFinished: () => void;
};

/** Statuses a cancellation still has a say over. */
const isUnsettled = (status: ImportRowStatus): boolean =>
  status === 'pending' || status === 'uploading';

/**
 * Imports a batch of detected skills one at a time, exposing a row per skill so
 * the UI can show progress and per-skill failures.
 *
 * One upload is in flight at a time by design: the endpoint takes a single skill
 * and a failure has to leave the rest of the batch untouched.
 */
export function useSequentialSkillImport({
  uploadSkill,
  onFinished,
}: UseSequentialSkillImportParams) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // A ref rather than the state flag: state updates are not visible
  // synchronously, so a second call in the same tick would slip past an
  // `if (isImporting)` check and interleave its uploads with the running batch.
  const runningRef = useRef(false);

  // Held for the lifetime of one batch so `cancel` can reach the request that is
  // in flight, rather than only stopping the loop before the next one starts —
  // a multi-megabyte upload is exactly the case where waiting for the current
  // skill to finish would make the button feel broken.
  const abortRef = useRef<AbortController | null>(null);

  const updateRow = useCallback((index: number, patch: Partial<ImportRow>) => {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }, []);

  const start = useCallback(
    async (skills: DetectedSkill[]) => {
      if (runningRef.current) return;
      runningRef.current = true;

      const controller = new AbortController();
      abortRef.current = controller;

      setIsImporting(true);
      setRows(skills.map((skill) => ({ name: skill.name, status: 'pending' })));

      try {
        // A sequential for-await, not Promise.all or map: the uploads must not
        // overlap, and each row's status has to reflect the one being sent.
        for (let index = 0; index < skills.length; index++) {
          if (controller.signal.aborted) break;

          const skill = skills[index];

          if (skill.validationError) {
            updateRow(index, {
              status: 'failed',
              error: skill.validationError,
            });
            continue;
          }

          updateRow(index, { status: 'uploading' });
          try {
            await uploadSkill(skill, controller.signal);
            updateRow(index, { status: 'success' });
          } catch (error) {
            // An abort surfaces here as a rejection too, and it is not a
            // failure of this skill — the sweep below gives it the right status.
            if (controller.signal.aborted) break;

            updateRow(index, {
              status: 'failed',
              // PackmindError carries the server's message, so this is the
              // domain error the API reported rather than an HTTP status.
              error: error instanceof Error ? error.message : 'Upload failed',
            });
          }
        }
      } finally {
        if (controller.signal.aborted) {
          // Whatever never settled — the one that was in flight and everything
          // still queued behind it. Skills already imported keep their status:
          // cancelling stops the batch, it does not undo what reached the server.
          setRows((current) =>
            current.map((row) =>
              isUnsettled(row.status) ? { ...row, status: 'cancelled' } : row,
            ),
          );
        }

        runningRef.current = false;
        abortRef.current = null;
        setIsImporting(false);
      }

      // Fires after a cancellation as well: the skills that did go through are
      // on the server, so the list behind this panel is stale either way.
      onFinished();
    },
    [uploadSkill, onFinished, updateRow],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // Callers must drop the previous batch's rows when the selection changes, or
  // the results of the last import would be shown against the new selection.
  const reset = useCallback(() => setRows([]), []);

  return { rows, isImporting, start, cancel, reset };
}
