#!/usr/bin/env node
/**
 * Self-check for the line classifier. Run with:
 *   node tools/comment-ratio/selftest.mjs
 *
 * Expectations are written as one digit per line: 0 = blank, 1 = code,
 * 2 = comment.
 */
import { classifyLines } from './classify.mjs';

const cases = [
  {
    name: 'strings, regexes and template literals are not comments',
    file: 'sample.ts',
    source: [
      '// a leading comment', // 2
      "import x from 'y';", // 1
      '', // 0
      '/**', // 2
      ' * JSDoc', // 2
      ' */', // 2
      'export const a = 1; // a trailing comment', // 1
      "const url = 'http://example.com/not-a-comment';", // 1
      'const re = /\\/\\/ not a comment/;', // 1
      'const tpl = `a // b ${x} /* c */`;', // 1
      '/* inline */ const b = 2;', // 1
      'const z = 3; /* a block comment starting after code', // 1
      '   keeps going', // 2
      '   and ends */', // 2
    ].join('\n'),
    expected: '21022211111122',
  },
  {
    name: 'JSX text is content, and {/* ... */} is the JSX comment idiom',
    file: 'sample.tsx',
    source: [
      'export const C = () => (', // 1
      '  <div>', // 1
      '    {/* a real comment */}', // 2
      '    // this line is rendered to the user, not a comment', // 1
      "    <span>{'/* also rendered */'}</span>", // 1
      '  </div>', // 1
      ');', // 1
    ].join('\n'),
    expected: '1121111',
  },
  {
    name: 'a JSX comment spanning several lines is a comment on every line',
    file: 'sample.tsx',
    source: [
      'export const C = () => (', // 1
      '  <div>', // 1
      '    {/*', // 2
      '      a note about the markup below', // 2
      '    */}', // 2
      '    <span />', // 1
      '  </div>', // 1
      ');', // 1
    ].join('\n'),
    expected: '11222111',
  },
  {
    name: 'a byte-order mark does not turn the first line into code',
    file: 'sample.ts',
    source: '\ufeff// a header comment\nconst a = 1;\n',
    expected: '21',
  },
  {
    name: 'a file without a trailing newline still counts its last line',
    file: 'sample.ts',
    source: 'const a = 1;\n// end',
    expected: '12',
  },
  {
    name: 'an empty file has no lines',
    file: 'sample.ts',
    source: '',
    expected: '',
  },
];

let failures = 0;
for (const { name, file, source, expected } of cases) {
  const actual = [...classifyLines(file, source)].join('');
  if (actual === expected) {
    console.log(`PASS  ${name}`);
  } else {
    failures++;
    console.error(
      `FAIL  ${name}\n        expected ${expected}\n        actual   ${actual}`,
    );
  }
}

console.log(`\n${cases.length - failures}/${cases.length} passed`);
process.exit(failures === 0 ? 0 : 1);
