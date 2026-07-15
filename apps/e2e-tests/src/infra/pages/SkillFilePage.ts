import { ISkillFilePage } from '../../domain/pages';
import { AbstractPackmindAppPage } from './AbstractPackmindAppPage';

export class SkillFilePage
  extends AbstractPackmindAppPage
  implements ISkillFilePage
{
  async clickEdit(): Promise<void> {
    await this.page.getByRole('button', { name: 'Edit file' }).click();
  }

  async replaceEditorContent(content: string): Promise<void> {
    const editor = this.page.locator('.cm-content').first();
    await editor.click();
    await this.page.keyboard.press('ControlOrMeta+A');
    await this.page.keyboard.press('Backspace');
    await this.page.keyboard.insertText(content);
  }

  async clickSave(): Promise<void> {
    await this.page.getByRole('button', { name: 'Save' }).click();

    // The editor unmounts once the save succeeds and exits edit mode,
    // bringing the Edit button back — use that as the completion signal.
    await this.page.getByRole('button', { name: 'Edit file' }).waitFor();
  }

  async clickSaveExpectingError(): Promise<string> {
    await this.page.getByRole('button', { name: 'Save' }).click();

    const alert = this.page.getByText(
      /cannot be empty|exceeds the maximum length/,
    );
    await alert.waitFor();
    return alert.innerText();
  }

  async isEditorEditable(): Promise<boolean> {
    const editor = this.page.locator('.cm-content').first();
    await editor.waitFor();
    return (await editor.getAttribute('contenteditable')) === 'true';
  }

  async readDisplayedContent(): Promise<string> {
    const rawTab = this.page.getByRole('tab', { name: 'Raw' });
    if (await rawTab.isVisible()) {
      await rawTab.click();
    }

    const content = this.page.locator('.cm-content').first();
    await content.waitFor();
    return content.innerText();
  }

  async getVersionNumber(): Promise<number> {
    const versionLabel = this.page.getByText('Version:', { exact: true });
    await versionLabel.waitFor();
    const text = await versionLabel.locator('xpath=..').innerText();
    const match = text.match(/(\d+)/);
    if (!match) {
      throw new Error(`Unable to parse skill version from "${text}"`);
    }
    return Number(match[1]);
  }

  expectedUrl(): RegExp {
    return /.*\/skills\/[^/]+\/files.*$/;
  }
}
