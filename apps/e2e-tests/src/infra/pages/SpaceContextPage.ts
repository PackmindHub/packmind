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
   * What the version area currently reads: `Not released yet` while the
   * package has no release, the version string once it has one.
   */
  async getCurrentVersion(): Promise<string> {
    const versionDisplay = this.versionDisplay();
    await versionDisplay.waitFor({ state: 'visible' });

    return (await versionDisplay.innerText()).trim();
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
