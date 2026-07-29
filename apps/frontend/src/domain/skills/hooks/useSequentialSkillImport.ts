import { useCallback, useRef, useState } from 'react';

import { DetectedSkill } from '../utils/collectSkillsFromFiles';

export type ImportRowStatus = 'pending' | 'uploading' | 'success' | 'failed';

export type ImportRow = {
  name: string;
  status: ImportRowStatus;
  error?: string;
};

type UploadSkillFn = (skill: DetectedSkill) => Promise<unknown>;

type UseSequentialSkillImportParams = {
  uploadSkill: UploadSkillFn;
  /** Called once the whole batch has settled — where the caller invalidates the skills list. */
  onFinished: () => void;
};

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

  const updateRow = useCallback((index: number, patch: Partial<ImportRow>) => {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }, []);

  const start = useCallback(
    async (skills: DetectedSkill[]) => {
      if (runningRef.current) return;
      runningRef.current = true;

      setIsImporting(true);
      setRows(skills.map((skill) => ({ name: skill.name, status: 'pending' })));

      try {
        // A sequential for-await, not Promise.all or map: the uploads must not
        // overlap, and each row's status has to reflect the one being sent.
        for (let index = 0; index < skills.length; index++) {
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
            await uploadSkill(skill);
            updateRow(index, { status: 'success' });
          } catch (error) {
            updateRow(index, {
              status: 'failed',
              // PackmindError carries the server's message, so this is the
              // domain error the API reported rather than an HTTP status.
              error: error instanceof Error ? error.message : 'Upload failed',
            });
          }
        }
      } finally {
        runningRef.current = false;
        setIsImporting(false);
      }

      onFinished();
    },
    [uploadSkill, onFinished, updateRow],
  );

  // Callers must drop the previous batch's rows when the selection changes, or
  // the results of the last import would be shown against the new selection.
  const reset = useCallback(() => setRows([]), []);

  return { rows, isImporting, start, reset };
}
