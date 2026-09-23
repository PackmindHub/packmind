import { Locator } from '@playwright/test';
import { PackageVersionBarDataTestId } from '@packmind/frontend';
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
    await this.releaseAction().click();

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
    await this.releaseAction().click();

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
   * What the version bar says is on screen.
   *
   * By test id rather than by its neighbours: the bar reads `Not released yet`
   * as a sentence and `Unreleased` as the control that opens the versions, and
   * the release action beside it is absent whenever there is nothing to cut,
   * so nothing about its position is stable.
   */
  async getReading(): Promise<string> {
    const reading = this.reading();
    await reading.waitFor({ state: 'visible' });

    return (await reading.innerText()).trim();
  }

  async listReleaseVersions(): Promise<string[]> {
    await this.openVersions();

    // Every reading but the first is a release; the first is the package as it
    // stands, which is not a version and carries no date.
    const items = await this.page.getByRole('menuitemradio').all();
    const labels = await Promise.all(
      items.map(async (item) => (await item.innerText()).trim()),
    );

    await this.page.keyboard.press('Escape');

    // The date travels on the same row, under it in the flow, so the version is
    // the first line of the label.
    return labels.slice(1).map((label) => label.split('\n')[0].trim());
  }

  async listComponentsPinnedBy(version: string): Promise<string[]> {
    await this.openVersions();
    await this.page
      .getByRole('menuitemradio', { name: new RegExp(`^${version}\\b`) })
      .click();

    // The pane reads the release over the network, so the rows are what says
    // the switch landed rather than the click that asked for it.
    const rows = this.page.getByTestId(
      PackageVersionBarDataTestId.PinnedComponent,
    );
    await rows.first().waitFor({ state: 'visible' });

    const lines = await rows.allInnerTexts();

    // Each row is the component's name and the version it was frozen at, laid
    // out as two columns rather than one string.
    return lines.map((line) =>
      line
        .split('\n')
        .map((p) => p.trim())
        .join(' '),
    );
  }

  /**
   * Whether the release action is offered.
   *
   * Presence and not `isDisabled`: the bar drops the action when the package is
   * identical to its last release or holds nothing, on the same rule the rest
   * of this header follows.
   */
  async canCreateRelease(): Promise<boolean> {
    return (await this.releaseAction().count()) > 0;
  }

  /** Opens the list of readings, and waits for it to be on screen. */
  private async openVersions(): Promise<void> {
    await this.reading().click();
    await this.page
      .getByRole('menuitemradio')
      .first()
      .waitFor({ state: 'visible' });
  }

  private reading(): Locator {
    return this.page.getByTestId(PackageVersionBarDataTestId.Reading);
  }

  /**
   * `Create a release` is also the drawer's heading, so the trigger is taken by
   * role rather than by text. Its label names the first cut when there is no
   * release behind the package.
   */
  private releaseAction(): Locator {
    return this.page.getByRole('button', {
      name: /^Create (a|the first) release$/,
    });
  }

  expectedUrl(): RegExp {
    return /\/org\/[^/]+\/space\/[^/]+\/context/;
  }
}
