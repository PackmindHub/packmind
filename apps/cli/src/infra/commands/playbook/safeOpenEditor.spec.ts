import { safeOpenEditor } from './safeOpenEditor';
import * as editorMessageModule from '../../utils/editorMessage';
import * as consoleLoggerModule from '../../utils/consoleLogger';

jest.mock('../../utils/editorMessage');
jest.mock('../../utils/consoleLogger');

describe('safeOpenEditor', () => {
  const mockedOpenEditorForMessage =
    editorMessageModule.openEditorForMessage as jest.Mock;
  const mockedLogErrorConsole =
    consoleLoggerModule.logErrorConsole as jest.Mock;

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when it is a non-empty string', () => {
    it('returns the editor result', () => {
      mockedOpenEditorForMessage.mockReturnValue('my message');

      expect(safeOpenEditor('prefill')).toBe('my message');
    });
  });

  describe('when the editor result is an empty string', () => {
    it('returns null', () => {
      mockedOpenEditorForMessage.mockReturnValue('');

      expect(safeOpenEditor('prefill')).toBeNull();
    });
  });

  describe('when openEditorForMessage throws', () => {
    it('returns null', () => {
      mockedOpenEditorForMessage.mockImplementation(() => {
        throw new Error(
          'No text editor found. Set the EDITOR environment variable to your preferred editor, or pass the message inline with -m "<message>".',
        );
      });

      expect(safeOpenEditor('prefill')).toBeNull();
    });
  });

  describe('when openEditorForMessage throws a non-Error value', () => {
    it('returns null', () => {
      mockedOpenEditorForMessage.mockImplementation(() => {
        throw 'raw string failure'; // non-Error throw to exercise String() path
      });

      expect(safeOpenEditor('prefill')).toBeNull();
    });
  });
});
