import { RuleTester } from 'eslint';
import type { Rule } from 'eslint';
// The rule is authored as CommonJS; default import resolves to module.exports.
import rule from './usecase-casing';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
});

ruleTester.run('usecase-casing', rule as unknown as Rule.RuleModule, {
  valid: [
    // Correctly-cased identifiers and filenames.
    {
      code: 'export class AddGitRepoUseCase {}',
      filename: 'AddGitRepoUseCase.ts',
    },
    { code: 'const captureRecipeUseCase = 1;', filename: 'Foo.ts' },
    { code: 'const linterUseCases = 1;', filename: 'Foo.ts' },
    // The all-lowercase legacy "usecase" is NOT this rule's concern.
    { code: 'const x = 1;', filename: 'foo.usecase.ts' },
    { code: 'const x = 1;', filename: 'plain.ts' },
  ],
  invalid: [
    // Mis-cased filename — lock the wording.
    {
      code: 'const x = 1;',
      filename: 'CaptureRecipeUsecase.ts',
      errors: [
        {
          message:
            'File "CaptureRecipeUsecase.ts" is mis-cased: use "UseCase", not "Usecase". Rename it to "CaptureRecipeUseCase.ts".',
        },
      ],
    },
    // Mis-cased instance variable.
    {
      code: 'const captureRecipeUsecase = 1;',
      filename: 'Foo.ts',
      errors: [
        {
          message:
            'Identifier "captureRecipeUsecase" is mis-cased: use "UseCase", not "Usecase". Rename it to "captureRecipeUseCase".',
        },
      ],
    },
    // Mis-cased class name (a class id is an identifier).
    {
      code: 'export class FooUsecase {}',
      filename: 'Foo.ts',
      errors: [{ messageId: 'identifierCasing' }],
    },
    // Plural aggregator.
    {
      code: 'const linterUsecases = 1;',
      filename: 'Foo.ts',
      errors: [{ messageId: 'identifierCasing' }],
    },
  ],
});
