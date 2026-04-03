import * as fs from 'fs/promises';
import * as path from 'path';
import { IncompatibleInstalledSkill } from '../../../domain/useCases/IInstallDefaultSkillsUseCase';
import {
  logSuccessConsole,
  logErrorConsole,
  logInfoConsole,
  logWarningConsole,
} from '../../utils/consoleLogger';

export async function handleIncompatibleInstalledSkills(
  skills: IncompatibleInstalledSkill[],
  baseDirectory: string,
  confirm: () => Promise<boolean>,
): Promise<void> {
  const skillNames = skills.map((s) => s.skillName).join(', ');
  logWarningConsole(
    `The following skill(s) are installed but are not compatible with this version of packmind-cli: ${skillNames}`,
  );
  logInfoConsole('These skills will be deleted.');

  const confirmed = await confirm();
  if (!confirmed) {
    logInfoConsole('Deletion cancelled.');
    return;
  }

  for (const skill of skills) {
    // Folder-based skills: delete the skill root directory (parent of SKILL.md) entirely
    const skillRootDirs = skill.filePaths
      .filter((p) => path.basename(p) === 'SKILL.md')
      .map((p) => path.dirname(p));

    for (const dir of skillRootDirs) {
      try {
        await fs.rm(path.join(baseDirectory, dir), {
          recursive: true,
          force: true,
        });
      } catch (error) {
        logErrorConsole(
          `Failed to delete skill folder "${dir}": ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Flat skills: unlink any file not already covered by a deleted skill folder
    for (const relativePath of skill.filePaths) {
      if (!skillRootDirs.some((dir) => relativePath.startsWith(dir + '/'))) {
        try {
          await fs.unlink(path.join(baseDirectory, relativePath));
        } catch (error) {
          logErrorConsole(
            `Failed to delete "${relativePath}": ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }
  }

  logSuccessConsole(`Incompatible skill(s) deleted: ${skillNames}`);
}
