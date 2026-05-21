import fs from 'fs';
import path from 'path';
import {
  describeWithUserSignedUp,
  describeForVersion,
  RunCliResult,
  UserSignedUpContext,
  readFile,
  fileExists,
  updateFile,
} from './helpers';
import { PackmindLockFile, PackmindLockFileEntry } from '@packmind/types';

/**
 * MANDATORY safety-critical regression test (mirror of the unit-level test
 * `InstallDefaultSkillsUseCase.spec.ts` "MANDATORY: user-skill preservation
 * regression") at the E2E layer.
 *
 * Origin: the predecessor sprint reverted a default-skill cleanup pass
 * (commit 76399bfb8) that conflated user-authored skills with default skills
 * and could delete them. This sprint reintroduces default-skill tracking with
 * a `source` discriminator so that future cleanups can run safely.
 *
 * This test pre-seeds a workspace with BOTH a user-authored skill (with real
 * on-disk files) AND a default-skill entry (with real on-disk files), runs
 * `skills init` (the pure default-skill operation), and asserts:
 *   - the user-skill lockfile entry is byte-equal before/after;
 *   - the user-skill on-disk files are byte-equal before/after;
 *   - default-skill entries may be updated but must remain tagged
 *     `source: 'default'`.
 *
 * `skills init` is chosen over `install` because the safety contract is
 * scoped to default-skill operations specifically. `install` with an empty
 * `packmind.json` triggers a separate package-empty cleanup branch
 * (InstallUseCase.ts) that deletes ALL lockfile-tracked artifacts — that
 * branch predates this sprint and is out-of-scope here. See the
 * implementation-plan's Known Issues section for downstream-sprint follow-up.
 */

const USER_SKILL_SLUG = 'my-custom-skill';
const USER_SKILL_REL_PATH = `.claude/skills/${USER_SKILL_SLUG}/SKILL.md`;
const USER_SKILL_COMPANION_REL_PATH = `.claude/skills/${USER_SKILL_SLUG}/notes.md`;

// Use a real default-skill slug that the CLI's default-skills deployer ships,
// so the install path actually touches the seeded entry.
const DEFAULT_SKILL_SLUG = 'packmind-create-skill';
const DEFAULT_SKILL_REL_PATH = `.claude/skills/${DEFAULT_SKILL_SLUG}/SKILL.md`;

const USER_SKILL_CONTENT = `---
name: ${USER_SKILL_SLUG}
description: A user-authored skill that MUST survive default-skill operations
---

User-owned content. The default-skills pipeline must NEVER mutate this file.
`;

const USER_SKILL_COMPANION_CONTENT = `# Notes

Hand-edited companion file. Default-skill operations must leave it untouched.
`;

// Intentionally stale content so we can detect any accidental overwrite of a
// seeded "default" file by the real default-skill deployer. If the deployer
// updates this file, the lockfile entry stays tagged source='default' and we
// don't assert byte-equality of the default-skill file (it can change).
const SEEDED_DEFAULT_SKILL_CONTENT = `---
name: ${DEFAULT_SKILL_SLUG}
description: Seeded placeholder for the default skill
---

Seeded placeholder. The CLI may update this on next install.
`;

function makeUserSkillEntry(): PackmindLockFileEntry {
  return {
    name: USER_SKILL_SLUG,
    type: 'skill',
    id: USER_SKILL_SLUG,
    version: 7,
    spaceId: 'space-e2e-user-iso',
    packageIds: ['pkg-1', 'pkg-2'],
    source: 'user',
    files: [
      {
        path: USER_SKILL_REL_PATH,
        agent: 'claude',
        isSkillDefinition: true,
      },
      {
        path: USER_SKILL_COMPANION_REL_PATH,
        agent: 'claude',
        isSkillDefinition: false,
      },
    ],
  };
}

function makeSeededDefaultSkillEntry(): PackmindLockFileEntry {
  return {
    name: DEFAULT_SKILL_SLUG,
    type: 'skill',
    id: DEFAULT_SKILL_SLUG,
    version: 1,
    spaceId: '',
    packageIds: [],
    source: 'default',
    files: [
      {
        path: DEFAULT_SKILL_REL_PATH,
        agent: 'claude',
        isSkillDefinition: true,
      },
    ],
  };
}

function writeFileWithDirs(absolutePath: string, content: string): void {
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, 'utf-8');
}

describeForVersion(
  '> 0.28.1',
  'user-skill preservation regression (MANDATORY safety contract)',
  () => {
    describeWithUserSignedUp(
      'skills init with seeded user + default skill files',
      (getContext) => {
        let context: UserSignedUpContext;
        let result: RunCliResult;
        let seededUserEntry: PackmindLockFileEntry;
        let lockFileAfter: PackmindLockFile;
        let userSkillContentBefore: string;
        let userSkillCompanionContentBefore: string;
        let userSkillEntryBefore: PackmindLockFileEntry;

        beforeEach(async () => {
          context = await getContext();

          seededUserEntry = makeUserSkillEntry();
          const seededDefaultEntry = makeSeededDefaultSkillEntry();

          const seededLockFile: PackmindLockFile = {
            lockfileVersion: 2,
            cliVersion: '0.25.0',
            packageSlugs: [],
            agents: ['claude'],
            artifacts: {
              [`user:skill:${USER_SKILL_SLUG}`]: seededUserEntry,
              [`default:skill:${DEFAULT_SKILL_SLUG}`]: seededDefaultEntry,
            },
          };

          updateFile(
            'packmind-lock.json',
            JSON.stringify(seededLockFile, null, 2) + '\n',
            context.testDir,
          );

          // Seed real on-disk files for the user skill (BOTH the SKILL.md
          // and a companion file) AND for the default skill.
          writeFileWithDirs(
            path.join(context.testDir, USER_SKILL_REL_PATH),
            USER_SKILL_CONTENT,
          );
          writeFileWithDirs(
            path.join(context.testDir, USER_SKILL_COMPANION_REL_PATH),
            USER_SKILL_COMPANION_CONTENT,
          );
          writeFileWithDirs(
            path.join(context.testDir, DEFAULT_SKILL_REL_PATH),
            SEEDED_DEFAULT_SKILL_CONTENT,
          );

          // Snapshot user-skill state BEFORE the run for byte-equality checks.
          userSkillContentBefore = readFile(
            USER_SKILL_REL_PATH,
            context.testDir,
          );
          userSkillCompanionContentBefore = readFile(
            USER_SKILL_COMPANION_REL_PATH,
            context.testDir,
          );
          userSkillEntryBefore = JSON.parse(
            JSON.stringify(seededUserEntry),
          ) as PackmindLockFileEntry;

          // Fresh test users default to coding agents ['packmind', 'agents_md']
          // — neither has a default-skill deployer. Override via packmind.json
          // so the claude default-skill deployers actually run and emit a
          // non-empty lockFileSlice for the merge to validate.
          updateFile(
            'packmind.json',
            JSON.stringify({ packages: {}, agents: ['claude'] }),
            context.testDir,
          );

          // `skills init` is the pure default-skill operation — it goes
          // straight to InstallDefaultSkillsUseCase without touching the
          // package install path. This is the exact scope the safety
          // contract addresses: user-authored skill entries MUST NEVER be
          // touched by default-skill operations.
          result = await context.runCli('skills init');

          const raw = readFile('packmind-lock.json', context.testDir);
          lockFileAfter = JSON.parse(raw) as PackmindLockFile;
        });

        it('exits successfully', () => {
          expect(result.returnCode).toBe(0);
        });

        it('preserves the user-skill SKILL.md byte-for-byte on disk', () => {
          expect(fileExists(USER_SKILL_REL_PATH, context.testDir)).toBe(true);
          const after = readFile(USER_SKILL_REL_PATH, context.testDir);
          expect(after).toBe(userSkillContentBefore);
        });

        it('preserves the user-skill companion file byte-for-byte on disk', () => {
          expect(
            fileExists(USER_SKILL_COMPANION_REL_PATH, context.testDir),
          ).toBe(true);
          const after = readFile(
            USER_SKILL_COMPANION_REL_PATH,
            context.testDir,
          );
          expect(after).toBe(userSkillCompanionContentBefore);
        });

        it('preserves the user-skill lockfile entry byte-for-byte', () => {
          const entryAfter =
            lockFileAfter.artifacts[`user:skill:${USER_SKILL_SLUG}`];
          expect(entryAfter).toBeDefined();
          // Deep-equal check on the entry payload itself.
          expect(entryAfter).toEqual(userSkillEntryBefore);
          // Byte-equality on the serialized form — the strongest possible
          // assertion that the user-skill entry was not mutated in any way.
          expect(JSON.stringify(entryAfter)).toBe(
            JSON.stringify(userSkillEntryBefore),
          );
        });

        it('keeps the user-skill key under the user: prefix', () => {
          expect(
            Object.prototype.hasOwnProperty.call(
              lockFileAfter.artifacts,
              `user:skill:${USER_SKILL_SLUG}`,
            ),
          ).toBe(true);
        });

        it('retains the default-skill entry tagged source: "default"', () => {
          const entryAfter =
            lockFileAfter.artifacts[`default:skill:${DEFAULT_SKILL_SLUG}`];
          expect(entryAfter).toBeDefined();
          expect(entryAfter.source).toBe('default');
        });

        it('does not duplicate the user-skill entry under default: prefix', () => {
          expect(
            lockFileAfter.artifacts[`default:skill:${USER_SKILL_SLUG}`],
          ).toBeUndefined();
        });
      },
    );
  },
);
