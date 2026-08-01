import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PMBox, PMButton, PMText, PMVStack } from '@packmind/ui';

import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import {
  useGetSkillsQuery,
  useUploadSkillMutation,
} from '../api/queries/SkillsQueries';
import { getSkillsBySpaceKey } from '../api/queryKeys';
import {
  ImportRow,
  useSequentialSkillImport,
} from '../hooks/useSequentialSkillImport';
import {
  collectSkillsFromFiles,
  DetectedSkill,
} from '../utils/collectSkillsFromFiles';
import {
  findDuplicateSkillNames,
  findSkillNameConflicts,
} from '../utils/findSkillNameConflicts';
import { readDeclaredSkillName } from '../utils/readDeclaredSkillName';
import { readDroppedEntries } from '../utils/readDroppedEntries';
import {
  findOversizedPayload,
  readSkillFileContents,
} from '../utils/readSkillFileContents';
import { SkillsUploadRow } from './SkillsUploadRow';

/** Stable empty default, so the selection handler keeps its identity. */
const NO_EXISTING_SKILLS: { name: string }[] = [];

/**
 * A detected skill whose `name` has been replaced by the identity the server
 * will use — the SKILL.md frontmatter name — with the directory it came from
 * kept for context.
 */
type ResolvedSkill = DetectedSkill & { folder: string };

export const SkillsUploadPanel = () => {
  const [detectedSkills, setDetectedSkills] = useState<ResolvedSkill[]>([]);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const { spaceId } = useCurrentSpace();
  const { data: existingSkills } = useGetSkillsQuery();
  const { mutateAsync: uploadSkillFiles } = useUploadSkillMutation();

  const uploadSkill = useCallback(
    async (skill: DetectedSkill) => {
      const files = await readSkillFileContents(skill);

      // Refused here rather than by the server: the request would be rejected
      // on its Content-Length alone, and a body cut off mid-flight reaches the
      // client as a bare network error with nothing about size in it.
      const tooLarge = findOversizedPayload(files);
      if (tooLarge) throw new Error(tooLarge);

      return uploadSkillFiles({ files });
    },
    [uploadSkillFiles],
  );

  const hasImportedRef = useRef(false);
  const onFinished = useCallback(() => {
    hasImportedRef.current = true;
  }, []);

  // The skills list is refreshed when the panel goes away, not when the import
  // finishes. Invalidating straight away swaps the page's blank state for the
  // skills table, and the blank state owns the dialog this panel lives in — so
  // the dialog would unmount at the very moment the results appear, and the user
  // would never see them. Refreshing on unmount keeps them on screen until the
  // dialog is closed, which is also when the list behind it becomes visible.
  const refreshRef = useRef(() => undefined as void);
  refreshRef.current = () => {
    void queryClient.invalidateQueries({
      queryKey: getSkillsBySpaceKey(spaceId),
    });
  };

  useEffect(
    () => () => {
      if (hasImportedRef.current) refreshRef.current();
    },
    [],
  );

  const { rows, isImporting, start, reset } = useSequentialSkillImport({
    uploadSkill,
    onFinished,
  });

  // Bumped per selection so a slower resolution cannot overwrite a newer pick.
  const selectionRef = useRef(0);

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (isImporting) return;
      const selection = ++selectionRef.current;

      // The identity of a skill is the name in its SKILL.md frontmatter, not the
      // folder it sits in — that is what the endpoint resolves it by. Reading it
      // here is what lets the checks below compare the right thing, and what
      // makes each row show the name that will actually exist.
      const resolved: ResolvedSkill[] = await Promise.all(
        collectSkillsFromFiles(files).map(async (skill) => {
          const declared = await readDeclaredSkillName(skill);
          return { ...skill, folder: skill.name, name: declared ?? skill.name };
        }),
      );
      if (selection !== selectionRef.current) return;

      const identities = resolved.map((skill) => skill.name);
      const takenInSpace = new Set(
        findSkillNameConflicts(
          identities,
          existingSkills ?? NO_EXISTING_SKILLS,
        ),
      );
      const claimedTwice = new Set(findDuplicateSkillNames(identities));

      reset();
      setDetectedSkills(
        resolved
          .map((skill) => {
            // A local problem comes first: it is the most actionable, and the
            // name checks may not even be reached.
            if (skill.validationError) return skill;

            if (takenInSpace.has(skill.name)) {
              return {
                ...skill,
                validationError: `A skill named "${skill.name}" already exists in this space`,
              };
            }

            if (claimedTwice.has(skill.name)) {
              return {
                ...skill,
                validationError: `More than one selected folder declares the skill "${skill.name}"`,
              };
            }

            return skill;
          })
          // Sorted for the reader: a folder pick arrives in whatever order the
          // filesystem enumerated it, which is neither alphabetical nor stable.
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    },
    [existingSkills, isImporting, reset],
  );

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (isImporting) return;
      // The item list is read synchronously inside readDroppedEntries — it is
      // invalidated as soon as this handler yields.
      await handleFiles(await readDroppedEntries(event.dataTransfer.items));
    },
    [handleFiles, isImporting],
  );

  // Before an import runs there are no rows yet, so the detected skills stand in
  // for them — already marked failed when they cannot be imported, so the reason
  // is visible without clicking Import first.
  const displayedRows: ImportRow[] =
    rows.length > 0
      ? rows
      : detectedSkills.map((skill) => ({
          name: skill.name,
          status: skill.validationError ? 'failed' : 'pending',
          error: skill.validationError,
        }));

  const importableCount = detectedSkills.filter(
    (skill) => !skill.validationError,
  ).length;
  const succeeded = rows.filter((row) => row.status === 'success').length;
  const failed = rows.filter((row) => row.status === 'failed').length;
  const isFinished = rows.length > 0 && !isImporting;

  return (
    <PMVStack align="stretch" gap={4} width="full">
      {/*
        A plain input and a hand-rolled drop target, deliberately not
        PMFileUpload: Ark's file-upload machine cannot carry a folder tree.
        It de-duplicates by name + size + type while ignoring the path, so a
        selection holding two same-sized SKILL.md files silently loses one; it
        appends to the previous selection instead of replacing it; and its own
        directory traversal stamps `relativePath` rather than
        `webkitRelativePath` and joins nested segments without a separator.
      */}
      <input
        ref={(node) => {
          folderInputRef.current = node;
          // The attribute that turns a file input into a directory picker.
          // React has no typing for it, so it is set on the node directly.
          node?.setAttribute('webkitdirectory', '');
        }}
        type="file"
        multiple
        hidden
        aria-hidden
        onChange={(event) => {
          void handleFiles(Array.from(event.target.files ?? []));
          // Let the same folder be picked again after a failed import.
          event.target.value = '';
        }}
      />
      <PMBox
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        borderWidth="1px"
        borderStyle="dashed"
        borderColor="border.tertiary"
        borderRadius="md"
        padding={6}
      >
        <PMVStack gap={3}>
          <PMText variant="small" color="secondary">
            Drag a folder of skills here, or choose one below.
          </PMText>
          <PMButton
            variant="secondary"
            disabled={isImporting}
            onClick={() => folderInputRef.current?.click()}
          >
            Choose folder
          </PMButton>
        </PMVStack>
      </PMBox>

      {displayedRows.length > 0 && (
        <PMVStack
          as="ul"
          align="stretch"
          gap={0}
          width="full"
          listStyleType="none"
          borderWidth="1px"
          borderColor="border.tertiary"
          borderRadius="md"
        >
          {displayedRows.map((row, index) => (
            // Indexed because two selected directories may share a leaf name.
            <PMBox as="li" key={`${row.name}-${index}`}>
              <SkillsUploadRow row={row} />
            </PMBox>
          ))}
        </PMVStack>
      )}

      {isFinished && (
        <PMText variant="small-important">
          {`${succeeded} imported, ${failed} failed`}
        </PMText>
      )}

      {/*
        Disabled once the batch has settled, not just while it runs: the results
        stay on screen, and leaving it live would let the same selection be sent
        again — uploading every skill a second time and adding a version to each.
        Choosing a folder again clears the results and re-arms it.
      */}
      <PMButton
        onClick={() => start(detectedSkills)}
        disabled={importableCount === 0 || isImporting || isFinished}
        loading={isImporting}
      >
        Import
      </PMButton>
    </PMVStack>
  );
};
