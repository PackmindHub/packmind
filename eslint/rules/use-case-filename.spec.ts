import { RuleTester } from 'eslint';
import type { Rule } from 'eslint';
// The rule is authored as CommonJS; default import resolves to module.exports.
import rule from './use-case-filename';

const ruleTester = new RuleTester();

ruleTester.run('use-case-filename', rule as unknown as Rule.RuleModule, {
  valid: [
    // Conformant PascalCase use-case files.
    { code: 'const x = 1;', filename: 'AddGitRepoUseCase.ts' },
    {
      code: 'const x = 1;',
      filename: 'src/application/useCases/addGitRepo/AddGitRepoUseCase.ts',
    },
    { code: 'const x = 1;', filename: 'AddGitRepoUseCase.spec.ts' },
    // Non-use-case helpers living inside useCases/ must NOT be flagged.
    { code: 'const x = 1;', filename: 'index.ts' },
    { code: 'const x = 1;', filename: 'utils.ts' },
    { code: 'const x = 1;', filename: 'shared/validateDisplayName.ts' },
  ],
  invalid: [
    // Lock the exact wording so the message stays clear & actionable.
    {
      code: 'const x = 1;',
      filename: 'addGitRepo.usecase.ts',
      errors: [
        {
          message:
            'Use-case file "addGitRepo.usecase.ts" breaks the naming convention: use-case files must be PascalCase ending in "UseCase" (e.g. AddGitRepoUseCase.ts), without the ".usecase" suffix. Rename it to "AddGitRepoUseCase.ts".',
        },
      ],
    },
    {
      code: 'const x = 1;',
      filename: 'addGitRepo.usecase.spec.ts',
      errors: [{ messageId: 'forbiddenSuffix' }],
    },
    {
      code: 'const x = 1;',
      filename:
        'src/application/useCases/checkProviderAuth/checkProviderAuth.usecase.ts',
      errors: [{ messageId: 'forbiddenSuffix' }],
    },
  ],
});
