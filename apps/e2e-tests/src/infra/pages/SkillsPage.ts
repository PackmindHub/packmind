import { ISkillFilePage, ISkillsPage } from '../../domain/pages';
import { AbstractPackmindAppPage } from './AbstractPackmindAppPage';

export class SkillsPage extends AbstractPackmindAppPage implements ISkillsPage {
  async listSkills(): Promise<{ name: string }[]> {
    await this.page.locator('table tbody tr').first().waitFor();

    const rows = this.page.locator('table tbody tr');
    const count = await rows.count();
    const result: { name: string }[] = [];

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const link = row.locator('a');
      const name = await link.innerText();
      result.push({ name: name.trim() });
    }

    return result;
  }

  async selectSkillByName(name: string): Promise<void> {
    const row = this.page
      .locator('table tbody tr')
      .filter({ has: this.page.getByRole('link', { name }) });
    await row.locator('[data-part="control"]').click();
  }

  async selectAll(): Promise<void> {
    await this.page.locator('table thead [data-part="control"]').click();
  }

  async moveToSpace(spaceName: string): Promise<void> {
    await this.page.getByTestId('move-to-space-button').click();

    await this.page.getByText('Select a destination space').click();

    await this.page
      .locator('[data-part="item"]')
      .filter({ hasText: spaceName })
      .click();

    await this.page.getByRole('button', { name: 'Move' }).click();

    await this.page.getByText('moved to the selected space').waitFor();
  }

  async moveToSpaceExpectingError(spaceName: string): Promise<string> {
    await this.page.getByTestId('move-to-space-button').click();

    await this.page.getByText('Select a destination space').click();

    await this.page
      .locator('[data-part="item"]')
      .filter({ hasText: spaceName })
      .click();

    await this.page.getByRole('button', { name: 'Move' }).click();

    const errorToast = this.page.getByText('already exists');
    await errorToast.waitFor();
    return errorToast.innerText();
  }

  async hasNoSkills(): Promise<boolean> {
    return this.page.getByText('No skills yet').isVisible();
  }

  async openSkill(name: string): Promise<ISkillFilePage> {
    const row = this.page
      .locator('table tbody tr')
      .filter({ has: this.page.getByRole('link', { name }) });
    await row.getByRole('link', { name }).click();

    return this.pageFactory.getSkillFilePage();
  }

  async openImportDialog(): Promise<void> {
    const blankState = this.page.getByRole('heading', {
      name: /no skills yet/i,
    });

    // Which entry point exists depends on whether the space already has skills,
    // so wait for the list to resolve one way or the other first. Branching on a
    // point-in-time check races the initial render and picks the wrong button.
    await blankState.or(this.page.locator('table tbody tr').first()).waitFor();

    if (await blankState.isVisible()) {
      // Blank state: a direct Import button on the "Import your skills" card.
      await this.page
        .getByRole('button', { name: 'Import', exact: true })
        .click();
    } else {
      // Once skills exist, importing moves under the Create menu in the header.
      await this.page
        .getByRole('button', { name: 'Create', exact: true })
        .click();
      await this.page
        .getByRole('menuitem')
        .filter({ hasText: 'Import skills' })
        .click();
    }

    await this.importDialog()
      .getByText(/drag a folder/i)
      .waitFor();
  }

  async chooseSkillsFolder(directoryPath: string): Promise<void> {
    // A single directory path: the input carries `webkitdirectory`, so Playwright
    // walks the tree and sets webkitRelativePath on every file, exactly as a
    // browser folder pick does.
    await this.page
      .locator('input[type="file"][webkitdirectory]')
      .setInputFiles(directoryPath);
    await this.importDialog().getByRole('listitem').first().waitFor();
  }

  async listDetectedSkills(): Promise<string[]> {
    return this.importDialog().getByRole('listitem').allInnerTexts();
  }

  async importDetectedSkills(): Promise<string> {
    await this.importDialog()
      .getByRole('button', { name: 'Import', exact: true })
      .click();

    const summary = this.importDialog().getByText(/\d+ imported, \d+ failed/);
    await summary.waitFor();
    return summary.innerText();
  }

  async closeImportDialog(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await this.importDialog().waitFor({ state: 'hidden' });
  }

  private importDialog() {
    return this.page.getByRole('dialog').filter({ hasText: 'import skills' });
  }

  expectedUrl(): RegExp {
    return /.*\/skills$/;
  }
}
