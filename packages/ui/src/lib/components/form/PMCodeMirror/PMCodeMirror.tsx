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
import { markdown } from '@codemirror/lang-markdown';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { rust } from '@codemirror/lang-rust';
import { vue } from '@codemirror/lang-vue';
import { css } from '@codemirror/lang-css';
import { yaml } from '@codemirror/lang-yaml';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { ruby } from '@codemirror/legacy-modes/mode/ruby';
import { swift } from '@codemirror/legacy-modes/mode/swift';
import { StreamLanguage } from '@codemirror/language';
// Note: Kotlin support would require: import { kotlin } from '@codemirror/lang-kotlin';

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
    case 'C':
      normalizedLanguage = 'C';
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
    case 'KT':
    case 'KOTLIN':
      normalizedLanguage = 'KOTLIN';
      break;
    case 'VUE':
      normalizedLanguage = 'VUE';
      break;
    case 'CSS':
      normalizedLanguage = 'CSS';
      break;
    case 'YAML':
    case 'YML':
      normalizedLanguage = 'YAML';
      break;
    case 'JSON':
      normalizedLanguage = 'JSON';
      break;
    case 'XML':
      normalizedLanguage = 'XML';
      break;
    case 'BASH':
    case 'SH':
    case 'SHELL':
      normalizedLanguage = 'BASH';
      break;
    case 'MARKDOWN':
    case 'MD':
      normalizedLanguage = 'MARKDOWN';
      break;
    case 'RUST':
    case 'RS':
      normalizedLanguage = 'RUST';
      break;
    case 'ABAP':
    case 'SAP_ABAP':
      normalizedLanguage = 'SAP_ABAP';
      break;
    case 'CDS':
    case 'SAP_CDS':
      normalizedLanguage = 'SAP_CDS';
      break;
    case 'SAP_HANA_SQL':
    case 'HANA_SQL':
      normalizedLanguage = 'SAP_HANA_SQL';
      break;
    case 'SWIFT':
      normalizedLanguage = 'SWIFT';
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
    case 'C':
      return [cpp()];
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
    case 'KOTLIN':
      // Note: Kotlin support requires @codemirror/lang-kotlin package
      // For now, fallback to Java syntax highlighting
      return [java()];
    case 'VUE':
      return [vue()];
    case 'CSS':
      return [css()];
    case 'YAML':
      return [yaml()];
    case 'JSON':
      return [json()];
    case 'XML':
      return [xml()];
    case 'BASH':
      return [StreamLanguage.define(shell)];
    case 'MARKDOWN':
      return [markdown()];
    case 'RUST':
      return [rust()];
    case 'SAP_ABAP':
      // Using Ruby syntax highlighting as fallback for SAP ABAP
      return [StreamLanguage.define(ruby)];
    case 'SAP_CDS':
      // Using Ruby syntax highlighting as fallback for SAP CDS
      return [StreamLanguage.define(ruby)];
    case 'SAP_HANA_SQL':
      // Using Ruby syntax highlighting as fallback for SAP HANA SQL
      return [StreamLanguage.define(ruby)];
    case 'SWIFT':
      return [StreamLanguage.define(swift)];
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
