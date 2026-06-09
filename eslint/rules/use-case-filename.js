'use strict';

/**
 * ESLint rule: enforce the use-case naming convention.
 *
 * Files and exported use-case classes under `application/useCases/` must be
 * PascalCase ending in `UseCase` (capital "C"). The rule reports:
 *   - filenames using the legacy dotted `.usecase` suffix      -> messageId legacyFilename
 *   - filenames ending in the mis-cased `Usecase`              -> messageId filenameCasing
 *   - exported classes ending in the mis-cased `Usecase`       -> messageId classCasing
 *   - exported (non-Error) classes not ending in `UseCase`     -> messageId classMissingSuffix
 *
 * Error classes (`extends Error` or named `*Error`) are ignored, as are files
 * with no exported class (helpers like `utils.ts`). The set of linted files is
 * controlled by the `files`/`ignores` globs in the consuming ESLint config
 * (see root `eslint.config.mjs`), which excludes `index.ts` and `shared/**`.
 */

const path = require('path');

const toPascalCase = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Legacy dotted suffix: foo.usecase.ts | foo.usecase.spec.ts | foo.usecase.test.tsx ...
const LEGACY = /\.usecase(\.(spec|test))?\.(tsx?)$/;
// Mis-cased filename ending: FooUsecase.ts | FooUsecase.spec.ts ...
const FILENAME_CASING = /Usecase((?:\.(spec|test))?\.tsx?)$/;

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Use-case files and classes must be PascalCase ending in "UseCase" (not <name>.usecase.ts and not "...Usecase").',
    },
    schema: [],
    messages: {
      legacyFilename:
        'Use-case file "{{filename}}" uses the legacy ".usecase" suffix. Rename it to PascalCase ending in "UseCase", e.g. "{{suggestion}}".',
      filenameCasing:
        'Use-case file "{{filename}}" must end in "UseCase" (capital "C"), not "Usecase". Rename it to "{{suggestion}}".',
      classCasing:
        'Use-case class "{{name}}" must end in "UseCase" (capital "C"), not "Usecase". Rename it to "{{suggestion}}".',
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
        if (!base) return;

        const legacy = base.match(LEGACY);
        if (legacy) {
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
          return;
        }

        if (FILENAME_CASING.test(base)) {
          context.report({
            node,
            messageId: 'filenameCasing',
            data: {
              filename: base,
              suggestion: base.replace(FILENAME_CASING, 'UseCase$1'),
            },
          });
        }
      },

      ClassDeclaration(node) {
        if (!base || !node.id) return;
        const parent = node.parent;
        const isExported =
          parent &&
          (parent.type === 'ExportNamedDeclaration' ||
            parent.type === 'ExportDefaultDeclaration');
        if (!isExported || isErrorClass(node)) return;

        const name = node.id.name;
        if (/UseCase$/.test(name)) return; // conformant

        if (/Usecase$/.test(name)) {
          context.report({
            node: node.id,
            messageId: 'classCasing',
            data: { name, suggestion: name.replace(/Usecase$/, 'UseCase') },
          });
        } else {
          context.report({
            node: node.id,
            messageId: 'classMissingSuffix',
            data: { name, suggestion: `${name}UseCase` },
          });
        }
      },
    };
  },
};
