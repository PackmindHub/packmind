import * as inquirer from 'inquirer';
import { createTrackConfirm, defaultConfirmPrompt } from './trackingPrompts';

jest.mock('inquirer', () => ({
  __esModule: true,
  default: { prompt: jest.fn() },
}));

const mockPrompt = (inquirer as unknown as { default: { prompt: jest.Mock } })
  .default.prompt;

describe('trackingPrompts', () => {
  afterEach(() => jest.clearAllMocks());

  describe('defaultConfirmPrompt', () => {
    beforeEach(async () => {
      mockPrompt.mockResolvedValue({ confirmed: false });
      await defaultConfirmPrompt('Track acme/app on branch dev?');
    });

    // Every operation behind this prompt changes which branch governs the
    // repository, so a bare Enter must not be enough to apply it.
    it('makes a bare Enter cancel rather than confirm', () => {
      expect(mockPrompt).toHaveBeenCalledWith([
        expect.objectContaining({ default: false }),
      ]);
    });

    it('asks the question it was given', () => {
      expect(mockPrompt).toHaveBeenCalledWith([
        expect.objectContaining({
          message: 'Track acme/app on branch dev?',
        }),
      ]);
    });
  });

  describe('createTrackConfirm', () => {
    describe('when the user declines at the prompt', () => {
      it('resolves to false', async () => {
        const confirm = createTrackConfirm({
          isTTY: true,
          confirmPrompt: jest.fn().mockResolvedValue(false),
        });

        await expect(
          confirm({ mode: 'set', owner: 'acme', repo: 'app', branch: 'dev' }),
        ).resolves.toBe(false);
      });
    });

    // Deliberate: without a TTY there is nobody to answer, and the user already
    // opted in by invoking the command. This is what lets the e2e suite drive
    // the confirmed path.
    describe('when there is no TTY', () => {
      let confirmPrompt: jest.Mock;
      let result: boolean;

      beforeEach(async () => {
        confirmPrompt = jest.fn();
        const confirm = createTrackConfirm({ isTTY: false, confirmPrompt });
        result = await confirm({
          mode: 'remove',
          owner: 'acme',
          repo: 'app',
          branch: 'main',
        });
      });

      it('confirms without asking', () => {
        expect(result).toBe(true);
      });

      it('never reaches the prompt', () => {
        expect(confirmPrompt).not.toHaveBeenCalled();
      });
    });
  });
});
