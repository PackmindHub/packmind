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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the editor result when it is a non-empty string', () => {
    mockedOpenEditorForMessage.mockReturnValue('my message');

    expect(safeOpenEditor('prefill')).toBe('my message');
    expect(mockedLogErrorConsole).not.toHaveBeenCalled();
  });

  it('returns null when the editor result is an empty string', () => {
    mockedOpenEditorForMessage.mockReturnValue('');

    expect(safeOpenEditor('prefill')).toBeNull();
    expect(mockedLogErrorConsole).not.toHaveBeenCalled();
  });

  it('returns null and logs the actionable error message when openEditorForMessage throws', () => {
    mockedOpenEditorForMessage.mockImplementation(() => {
      throw new Error(
        'No text editor found. Set the EDITOR environment variable to your preferred editor, or pass the message inline with -m "<message>".',
      );
    });

    expect(safeOpenEditor('prefill')).toBeNull();
    expect(mockedLogErrorConsole).toHaveBeenCalledWith(
      'Failed to open editor: No text editor found. Set the EDITOR environment variable to your preferred editor, or pass the message inline with -m "<message>".',
    );
  });

  it('stringifies non-Error throws when reporting', () => {
    mockedOpenEditorForMessage.mockImplementation(() => {
      throw 'raw string failure'; // non-Error throw to exercise String() path
    });

    expect(safeOpenEditor('prefill')).toBeNull();
    expect(mockedLogErrorConsole).toHaveBeenCalledWith(
      'Failed to open editor: raw string failure',
    );
  });
});
