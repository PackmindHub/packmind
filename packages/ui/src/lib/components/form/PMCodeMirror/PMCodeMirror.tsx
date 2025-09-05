import CodeMirror, { ReactCodeMirrorProps } from '@uiw/react-codemirror';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { go } from '@codemirror/lang-go';
import { sql } from '@codemirror/lang-sql';
import { java } from '@codemirror/lang-java';
import { html } from '@codemirror/lang-html';
import { php } from '@codemirror/lang-php';
import { sass } from '@codemirror/lang-sass';
import { csharp } from '@replit/codemirror-lang-csharp';
export interface IPMCodeMirrorProps extends ReactCodeMirrorProps {
  language?: string;
}

/**
 * Maps language string to CodeMirror language extensions
 */
const getLanguageExtensions = (language?: string) => {
  if (!language) return [];

  // Convert to uppercase and handle common variations
  let normalizedLanguage = language.toUpperCase();

  // Handle common legacy values that might exist in database
  switch (normalizedLanguage) {
    case 'JAVASCRIPT':
    case 'JS':
      normalizedLanguage = 'JAVASCRIPT';
      break;
    case 'TYPESCRIPT':
    case 'TS':
      normalizedLanguage = 'TYPESCRIPT';
      break;
    case 'JSX':
      normalizedLanguage = 'JAVASCRIPT_JSX';
      break;
    case 'TSX':
      normalizedLanguage = 'TYPESCRIPT_TSX';
      break;
    case 'PY':
      normalizedLanguage = 'PYTHON';
      break;
    case 'GOLANG':
      normalizedLanguage = 'GO';
      break;
    case 'C++':
    case 'CXX':
      normalizedLanguage = 'CPP';
      break;
    case 'C#':
    case 'CSHARP':
      normalizedLanguage = 'CSHARP';
      break;
    case 'SASS':
      normalizedLanguage = 'SCSS';
      break;
    case 'HTM':
      normalizedLanguage = 'HTML';
      break;
  }

  switch (normalizedLanguage) {
    case 'JAVASCRIPT':
      return [javascript()];
    case 'JAVASCRIPT_JSX':
      return [javascript({ jsx: true })];
    case 'TYPESCRIPT':
      return [javascript({ typescript: true })];
    case 'TYPESCRIPT_TSX':
      return [javascript({ jsx: true, typescript: true })];
    case 'PYTHON':
      return [python()];
    case 'GO':
      return [go()];
    case 'CPP':
      return [cpp()];
    case 'SQL':
      return [sql()];
    case 'HTML':
      return [html()];
    case 'SCSS':
      return [sass()];
    case 'PHP':
      return [php()];
    case 'JAVA':
      return [java()];
    case 'CSHARP':
      return [csharp()];
    default:
      return [];
  }
};

export const PMCodeMirror = (props: IPMCodeMirrorProps) => {
  const { language, extensions = [], ...restProps } = props;

  const defaultBasicSetup = {
    lineNumbers: true,
    foldGutter: true,
    dropCursor: false,
    allowMultipleSelections: false,
    indentOnInput: true,
    bracketMatching: true,
    closeBrackets: true,
    autocompletion: true,
    searchKeymap: true,
  };

  const basicSetup =
    typeof props.basicSetup === 'object'
      ? { ...defaultBasicSetup, ...props.basicSetup }
      : props.basicSetup !== false
        ? defaultBasicSetup
        : false;

  // Combine language extensions with any additional extensions passed as props
  const languageExtensions = getLanguageExtensions(language);
  const allExtensions = [...languageExtensions, ...extensions];

  return (
    <CodeMirror
      {...restProps}
      theme={dracula}
      basicSetup={basicSetup}
      extensions={allExtensions}
      style={{
        border: '1px solid transparent',
        borderRadius: 'var(--chakra-radii-md)',
        fontSize: 'var(--pm-font-sizes-sm)',
        ...props.style,
      }}
    />
  );
};
