'use strict';

/**
 * ESLint rule: structural use-case naming.
 *
 * For files under `application/useCases/` (packages only — see the scope gate
 * and the consuming config), it reports:
 *   - filenames using the legacy dotted `.usecase` suffix  -> messageId legacyFilename
 *   - exported (non-Error) classes that are PascalCase but lack the `UseCase`
 *     suffix, e.g. `CommitToGit`                            -> messageId classMissingSuffix
 *
 * The mis-cased "Usecase" -> "UseCase" concern (filenames AND identifiers) is
 * handled separately by the repo-wide `usecase-casing` rule, so this rule
 * deliberately ignores names containing "Usecase" to avoid double reporting.
 *
 * Error classes (`extends Error` or named `*Error`) and files with no exported
 * class (helpers like `utils.ts`) are not flagged. `index.ts` and `shared/**`
 * are excluded by the consuming config.
 */

const path = require('path');

const toPascalCase = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Legacy dotted suffix: foo.usecase.ts | foo.usecase.spec.ts | foo.usecase.test.tsx ...
const LEGACY = /\.usecase(\.(spec|test))?\.(tsx?)$/;

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Use-case files must not use the legacy <name>.usecase.ts suffix, and use-case classes must end in "UseCase".',
    },
    schema: [],
    messages: {
      legacyFilename:
        'Use-case file "{{filename}}" uses the legacy ".usecase" suffix. Rename it to PascalCase ending in "UseCase", e.g. "{{suggestion}}".',
      classMissingSuffix:
        'Use-case class "{{name}}" must be PascalCase ending in "UseCase". Rename it to "{{suggestion}}".',
    },
  },
  create(context) {
    const filename =
      context.physicalFilename ?? context.filename ?? context.getFilename();
    // Scope: only `packages/**` (the documented convention boundary). apps/* are
    // out of scope and may legitimately co-locate non-use-case classes (e.g. the
    // CLI's diff strategies) under useCases/.
    if (
      !filename ||
      filename.startsWith('<') ||
      !/(^|[/\\])packages[/\\]/.test(filename)
    ) {
      return {};
    }
    const base = path.basename(filename);

    const isErrorClass = (node) =>
      (node.superClass &&
        node.superClass.type === 'Identifier' &&
        node.superClass.name === 'Error') ||
      (node.id && /Error$/.test(node.id.name));

    return {
      Program(node) {
        const legacy = base.match(LEGACY);
        if (!legacy) return;
        const stem = base.slice(0, legacy.index);
        const kind = legacy[2] ? `.${legacy[2]}` : '';
        const ext = legacy[3]; // preserve original extension (ts / tsx)
        context.report({
          node,
          messageId: 'legacyFilename',
          data: {
            filename: base,
            suggestion: `${toPascalCase(stem)}UseCase${kind}.${ext}`,
          },
        });
      },

      ClassDeclaration(node) {
        if (!node.id) return;
        const parent = node.parent;
        const isExported =
          parent &&
          (parent.type === 'ExportNamedDeclaration' ||
            parent.type === 'ExportDefaultDeclaration');
        if (!isExported || isErrorClass(node)) return;

        const name = node.id.name;
        if (/UseCase$/.test(name)) return; // conformant
        if (/Usecase/.test(name)) return; // mis-cased: handled by usecase-casing

        context.report({
          node: node.id,
          messageId: 'classMissingSuffix',
          data: { name, suggestion: `${name}UseCase` },
        });
      },
    };
  },
};
