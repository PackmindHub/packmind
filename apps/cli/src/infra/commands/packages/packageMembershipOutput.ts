import { ItemType } from '../../../domain/entities/ItemType';
import { ItemNotFoundError } from '../../../domain/errors/ItemNotFoundError';
import {
  formatCommand,
  logConsole,
  logInfoConsole,
} from '../../utils/consoleLogger';
import { EXEC_NAME } from '../../utils/execName';

/**
 * Output shared by `packages add`, `packages move` and `packages remove` — the
 * three commands that move artefacts between packages and report the same kinds
 * of things back.
 */

/** Points at the listing command that would have shown the missing slug. */
export function logItemNotFoundHint(error: ItemNotFoundError): void {
  const spaceFlag = error.spaceSlug ? ` --space ${error.spaceSlug}` : '';
  const command = formatCommand(
    `${EXEC_NAME} ${error.itemType}s list${spaceFlag}`,
  );

  logInfoConsole(`Run \`${command}\` to display available ${error.itemType}s`);
}

/**
 * One package reads better inline — `<one> "@space/only-one"` — than as a
 * one-item list, so the two forms get their own lead-in.
 */
export function logPackageList(
  intro: { one: string; many: string },
  packageSlugs: string[],
): void {
  if (packageSlugs.length === 1) {
    logConsole(`${intro.one} "${packageSlugs[0]}"`);
    return;
  }

  logConsole(`${intro.many}:`);
  packageSlugs.forEach((slug) => logConsole(` - ${slug}`));
}

/** `Command "My command"`, the subject of every sentence these commands print. */
export function artefactSubject(itemType: ItemType, name: string): string {
  return `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} "${name}"`;
}
