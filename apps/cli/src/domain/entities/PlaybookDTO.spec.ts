import { playbookDTOSchema } from './PlaybookDTO';

describe('PlaybookDTO', () => {
  it('validates a correct playbook structure', () => {
    const validPlaybook = {
      name: 'React Best Practices',
      description: 'Standards for React development',
      scope: 'TypeScript React files',
      rules: [
        {
          content: 'Use functional components',
          examples: {
            positive: 'const App = () => <div>Hello</div>',
            negative: 'class App extends React.Component {}',
            language: 'TYPESCRIPT_TSX',
          },
        },
      ],
    };

    const result = playbookDTOSchema.safeParse(validPlaybook);
    expect(result.success).toBe(true);
  });

  it('rejects playbook missing required field "scope"', () => {
    const invalidPlaybook = {
      name: 'Test',
      description: 'Test',
      rules: [{ content: 'Use something' }],
    };

    const result = playbookDTOSchema.safeParse(invalidPlaybook);
    expect(result.success).toBe(false);
  });

  it('rejects playbook with empty rules array', () => {
    const invalidPlaybook = {
      name: 'Test',
      description: 'Test',
      scope: 'Test scope',
      rules: [],
    };

    const result = playbookDTOSchema.safeParse(invalidPlaybook);
    expect(result.success).toBe(false);
  });
});
