'use strict';

/**
 * ESLint rule: enforce "UseCase" casing repo-wide.
 *
 * The use-case concept is spelled "UseCase" (capital "C"). This rule flags the
 * mis-cased "Usecase" wherever it appears — in filenames and in identifiers
 * (class names, variables, parameters, properties, type/interface names) — and
 * suggests the corrected name. It is intentionally broad (not limited to
 * `useCases/`) so instance variables, factories and aggregators stay consistent.
 *
 * Note: only the PascalCase-style "Usecase" (capital "U", lowercase "c") is
 * flagged; an all-lowercase "usecase" (e.g. the legacy file suffix) is left to
 * the `use-case-filename` rule.
 */

const path = require('path');

const BAD = /Usecase/;
const fix = (s) => s.replace(/Usecase/g, 'UseCase');

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'The use-case concept must be spelled "UseCase", not "Usecase".',
    },
    schema: [],
    messages: {
      filenameCasing:
        'File "{{name}}" is mis-cased: use "UseCase", not "Usecase". Rename it to "{{suggestion}}".',
      identifierCasing:
        'Identifier "{{name}}" is mis-cased: use "UseCase", not "Usecase". Rename it to "{{suggestion}}".',
    },
  },
  create(context) {
    const filename =
      context.physicalFilename ?? context.filename ?? context.getFilename();
    return {
      Program(node) {
        if (!filename || filename.startsWith('<')) return;
        const base = path.basename(filename);
        if (BAD.test(base)) {
          context.report({
            node,
            messageId: 'filenameCasing',
            data: { name: base, suggestion: fix(base) },
          });
        }
      },
      Identifier(node) {
        if (BAD.test(node.name)) {
          context.report({
            node,
            messageId: 'identifierCasing',
            data: { name: node.name, suggestion: fix(node.name) },
          });
        }
      },
    };
  },
};
