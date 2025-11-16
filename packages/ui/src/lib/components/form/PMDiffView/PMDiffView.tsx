import CodeMirrorMerge from 'react-codemirror-merge';
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
import { EditorView } from '@codemirror/view';

const Original = CodeMirrorMerge.Original;
const Modified = CodeMirrorMerge.Modified;

export interface IPMDiffViewProps {
  original: string;
  modified: string;
  language?: string;
  height?: string;
  orientation?: 'a-b' | 'b-a';
  highlightChanges?: boolean;
  readOnly?: boolean;
}

/**
 * Maps language string to CodeMirror language extensions
 * Reused from PMCodeMirror for consistency
 */
const getLanguageExtensions = (language?: string) => {
  if (!language) return [];

  let normalizedLanguage = language.toUpperCase();

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
      return [StreamLanguage.define(ruby)];
    case 'SAP_CDS':
      return [StreamLanguage.define(ruby)];
    case 'SAP_HANA_SQL':
      return [StreamLanguage.define(ruby)];
    case 'SWIFT':
      return [StreamLanguage.define(swift)];
    default:
      return [];
  }
};

export const PMDiffView = ({
  original,
  modified,
  language,
  height = '400px',
  orientation = 'a-b',
  highlightChanges = true,
  readOnly = true,
}: IPMDiffViewProps) => {
  const languageExtensions = getLanguageExtensions(language);

  const commonExtensions = [
    ...languageExtensions,
    EditorView.editable.of(!readOnly),
  ];

  return (
    <div
      style={{
        height,
        border: '1px solid transparent',
        borderRadius: 'var(--chakra-radii-md)',
        fontSize: 'var(--pm-font-sizes-sm)',
        overflow: 'auto',
      }}
    >
      <CodeMirrorMerge
        orientation={orientation}
        highlightChanges={highlightChanges}
        theme={dracula}
      >
        <Original value={original} extensions={commonExtensions} />
        <Modified value={modified} extensions={commonExtensions} />
      </CodeMirrorMerge>
    </div>
  );
};
