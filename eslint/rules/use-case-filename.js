'use strict';

/**
 * ESLint rule: use-case files must be named in PascalCase (e.g. `AddGitRepoUseCase.ts`)
 * and must NOT use the legacy lowercase `<name>.usecase.ts` suffix.
 *
 * The rule only reports on the forbidden `.usecase` suffix, so helper files inside
 * `useCases/` (e.g. `index.ts`, `utils.ts`, `shared/*.ts`) are never false-positives.
 *
 * Scope is controlled by the `files` glob in the consuming ESLint config
 * (see root `eslint.config.mjs`), not by this rule.
 */

const path = require('path');

// Matches: foo.usecase.ts | foo.usecase.spec.ts | foo.usecase.test.ts (and .tsx)
const FORBIDDEN = /\.usecase(\.(spec|test))?\.tsx?$/;

const toPascalCase = (s) => s.charAt(0).toUpperCase() + s.slice(1);

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Use-case files must be PascalCase (e.g. AddGitRepoUseCase.ts), not <name>.usecase.ts.',
    },
    schema: [],
    messages: {
      // Clear, actionable: names the bad file, states the convention, gives the exact target name.
      forbiddenSuffix:
        'Use-case file "{{filename}}" breaks the naming convention: use-case files must be PascalCase ending in "UseCase" (e.g. AddGitRepoUseCase.ts), without the ".usecase" suffix. Rename it to "{{suggestion}}".',
    },
  },
  create(context) {
    return {
      Program(node) {
        const filename = context.filename ?? context.getFilename();
        if (!filename || filename.startsWith('<')) {
          return;
        }

        const base = path.basename(filename);
        const match = base.match(FORBIDDEN);
        if (!match) {
          return;
        }

        const stem = base.slice(0, match.index); // e.g. "addGitRepo"
        const kind = match[2] ? `.${match[2]}` : ''; // ".spec" | ".test" | ""
        const suggestion = `${toPascalCase(stem)}UseCase${kind}.ts`;

        context.report({
          node,
          messageId: 'forbiddenSuffix',
          data: { filename: base, suggestion },
        });
      },
    };
  },
};
