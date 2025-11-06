import { Factory, randomIn } from '@packmind/test-utils';
import {
  RecipeVersion,
  createRecipeVersionId,
} from '../src/domain/entities/RecipeVersion';
import { v4 as uuidv4 } from 'uuid';
import { createRecipeId } from '../src/domain/entities/Recipe';

export const recipeVersionFactory: Factory<RecipeVersion> = (
  recipeVersion?: Partial<RecipeVersion>,
) => {
  const recipeVersions: RecipeVersion[] = [
    {
      id: createRecipeVersionId(uuidv4()),
      recipeId: createRecipeId(uuidv4()),
      name: 'Write code using TDD',
      slug: 'write-code-using-tdd',
      content: `# Test-Driven Development Guide
1. Write a failing test first
2. Implement the minimum code to pass the test
3. Refactor your code
4. Repeat the cycle
5. Keep tests small and focused`,
      version: 1,
      summary:
        'Complete TDD workflow with red-green-refactor cycle for quality code development.',
      userId: null, // Default to null (git commits), can be overridden
    },
    {
      id: createRecipeVersionId(uuidv4()),
      recipeId: createRecipeId(uuidv4()),
      name: 'How to create a new model',
      slug: 'how-to-create-a-new-model',
      content: `# Creating a New Model
1. Define the interface/type with required properties
2. Implement validation logic if needed
3. Create factory functions for testing
4. Add repository methods for persistence
5. Write comprehensive tests`,
      version: 1,
      summary:
        'Systematic approach for implementing data models with proper typing and testing.',
      userId: null, // Default to null (git commits), can be overridden
    },
    {
      id: createRecipeVersionId(uuidv4()),
      recipeId: createRecipeId(uuidv4()),
      name: 'Setting up a React component',
      slug: 'setting-up-a-react-component',
      content: `# React Component Setup
1. Create a new file with .tsx extension
2. Import React and necessary hooks
3. Define props interface
4. Implement the functional component
5. Export and test your component`,
      version: 1,
      summary:
        'Step-by-step guide for creating and testing React functional components.',
      userId: null, // Default to null (git commits), can be overridden
    },
    {
      id: createRecipeVersionId(uuidv4()),
      recipeId: createRecipeId(uuidv4()),
      name: 'Git workflow best practices',
      slug: 'git-workflow-best-practices',
      content: `# Git Workflow
1. Create a feature branch from main
2. Make small, focused commits
3. Write descriptive commit messages
4. Pull and rebase regularly
5. Create a PR with clear description`,
      version: 1,
      userId: null, // Default to null (git commits), can be overridden
    },
    {
      id: createRecipeVersionId(uuidv4()),
      recipeId: createRecipeId(uuidv4()),
      name: 'Debugging TypeScript code',
      slug: 'debugging-typescript-code',
      content: `# TypeScript Debugging Tips
1. Use console.log with object destructuring
2. Leverage TypeScript's type checking
3. Set breakpoints in your IDE
4. Check for null/undefined values
5. Use the 'as' keyword cautiously`,
      version: 1,
      userId: null, // Default to null (git commits), can be overridden
    },
  ];

  return {
    ...randomIn(recipeVersions),
    ...recipeVersion,
  };
};
