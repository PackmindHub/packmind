import { Locator } from '@playwright/test';
import { ISpaceContextPage } from '../../domain/pages';
import { AbstractPackmindAppPage } from './AbstractPackmindAppPage';

/** The id the release drawer puts on its version input. */
const VERSION_FIELD_ID = 'create-package-release-version';

export class SpaceContextPage
  extends AbstractPackmindAppPage
  implements ISpaceContextPage
{
  /**
   * Cut a release of the package the surface is showing.
   *
   * The pre-filled version is replaced rather than appended to: the drawer
   * opens on its own suggestion, which is not necessarily the one asked for
   * here. Drives only — the assertion belongs to the spec.
   */
  async createRelease(version: string): Promise<void> {
    // `Create a release` is also the drawer's heading, so the trigger is taken
    // by role rather than by text.
    await this.page
      .getByRole('button', { name: 'Create a release', exact: true })
      .click();

    const versionField = this.page.locator(`#${VERSION_FIELD_ID}`);
    await versionField.waitFor({ state: 'visible' });
    await versionField.fill(version);

    const drawer = this.page
      .locator('[role="dialog"]')
      .filter({ has: this.page.locator(`#${VERSION_FIELD_ID}`) });
    await drawer.getByRole('button', { name: 'Release', exact: true }).click();

    // The drawer closes only once the mutation resolved, so its disappearance
    // is what says the release landed.
    await versionField.waitFor({ state: 'hidden' });
  }

  /**
   * Attempt a cut that may be refused, and read back the sentence the form
   * puts beside the version field.
   *
   * Deliberately not `createRelease`: that one waits for the drawer to close,
   * which a refused cut never does.
   */
  async attemptRelease(version: string): Promise<string> {
    await this.page
      .getByRole('button', { name: 'Create a release', exact: true })
      .click();

    const versionField = this.page.locator(`#${VERSION_FIELD_ID}`);
    await versionField.waitFor({ state: 'visible' });
    await versionField.fill(version);

    const drawer = this.page
      .locator('[role="dialog"]')
      .filter({ has: this.page.locator(`#${VERSION_FIELD_ID}`) });
    await drawer.getByRole('button', { name: 'Release', exact: true }).click();

    // The message is the field's error text, which the form renders only once
    // the verdict - client-side or server-side - is in.
    const message = drawer
      .locator(`#${VERSION_FIELD_ID}`)
      .locator('xpath=following-sibling::*[1]');
    await message.waitFor({ state: 'visible' });

    return (await message.innerText()).trim();
  }

  /**
   * What the version area currently reads: `Not released yet` while the
   * package has no release, the version string once it has one.
   */
  async getCurrentVersion(): Promise<string> {
    const versionDisplay = this.versionDisplay();
    await versionDisplay.waitFor({ state: 'visible' });

    return (await versionDisplay.innerText()).trim();
  }

  /**
   * Opens the release history drawer for the package, showing all available
   * releases. Drives only — the assertion belongs to the spec.
   */
  async openReleaseHistory(): Promise<void> {
    // The version display is a button only when the package has at least one
    // release, and it is the trigger for the history drawer.
    await this.versionDisplay().click();

    // The drawer opens only once the click resolves, and it is the dialog
    // containing the heading `Release history`.
    const historyDrawer = this.page.locator('[role="dialog"]').filter({
      has: this.page.getByRole('heading', { name: 'Release history' }),
    });
    await historyDrawer.waitFor({ state: 'visible' });
  }

  /**
   * In the open release history drawer, selects a version and returns the
   * pinned component lines, each in the form `<name> v<number>`, in DOM order
   * and trimmed. Waits for the detail view to render after the selection.
   */
  async listComponentsPinnedBy(version: string): Promise<string[]> {
    // The version is listed as a button in the release history drawer. Use
    // exact match to avoid substring overlaps.
    const historyDrawer = this.page.locator('[role="dialog"]').filter({
      has: this.page.getByRole('heading', { name: 'Release history' }),
    });
    await historyDrawer
      .getByRole('button', { name: version, exact: true })
      .click();

    // The detail view fetches over the network; wait for it to appear by
    // waiting for the Standards section to be visible. The detail view is
    // rendered only once the fetch resolves, so this ensures the full content
    // has arrived.
    await historyDrawer
      .getByText('Standards', { exact: true })
      .waitFor({ state: 'visible' });

    // Extract all component lines in the drawer. Each line is `<name> v<number>`.
    // The regex filters out headers and description by matching the pattern.
    const componentPattern = / v\d+$/;
    const allText = await historyDrawer.innerText();
    const lines = allText.split('\n').map((line) => line.trim());
    const componentLines = lines.filter((line) => componentPattern.test(line));

    return componentLines;
  }

  /**
   * Whether the "Create a release" button is currently enabled. Returns the
   * negation of Playwright's isDisabled() check.
   */
  async canCreateRelease(): Promise<boolean> {
    const button = this.page.getByRole('button', {
      name: 'Create a release',
      exact: true,
    });
    return !(await button.isDisabled());
  }

  /**
   * The visible reason text explaining why the release action is disabled.
   * Returns the trimmed text from the element immediately after the button row.
   * Waits for it to be visible; returns empty string if not found.
   */
  async getReleaseBlockedReason(): Promise<string> {
    const reasonElement = this.page
      .getByRole('button', { name: 'Create a release', exact: true })
      .locator('xpath=ancestor::*[1]/following-sibling::*[1]');

    try {
      await reasonElement.waitFor({ state: 'visible' });
      return (await reasonElement.innerText()).trim();
    } catch {
      return '';
    }
  }

  /**
   * The badge (no release) or button (released) sitting just before the
   * `Create a release` trigger in the version area. Both states have to be
   * reachable through one locator, and only the second one is a button — hence
   * the sibling hop rather than a role. The whole area renders only once the
   * releases query answered.
   */
  private versionDisplay(): Locator {
    return this.page
      .getByRole('button', { name: 'Create a release', exact: true })
      .locator('xpath=preceding-sibling::*[1]');
  }

  expectedUrl(): RegExp {
    return /\/org\/[^/]+\/space\/[^/]+\/context/;
  }
}
