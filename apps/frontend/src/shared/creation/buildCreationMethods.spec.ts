import { ARTIFACT_CREATION_ROUTES } from './artifactCreationRoutes';
import type { ArtifactCreationRoutes } from './artifactCreationRoutes';
import { buildCreationMethods, listTypeLabels } from './buildCreationMethods';

const routes = (
  overrides: Partial<ArtifactCreationRoutes> = {},
): ArtifactCreationRoutes => ({
  agentCanWrite: false,
  formRoute: null,
  hasSamples: false,
  importable: false,
  ...overrides,
});

const form = () => routes({ formRoute: () => '/somewhere' });

describe('buildCreationMethods', () => {
  describe('with the types the product ships today', () => {
    const methods = buildCreationMethods(ARTIFACT_CREATION_ROUTES, [
      'standard',
      'command',
      'skill',
    ]);

    it('offers the agent every type', () => {
      expect(methods.agent?.types).toEqual(['standard', 'command', 'skill']);
    });

    it('offers samples only where Packmind ships content', () => {
      expect(methods.samples?.types).toEqual(['standard']);
    });

    it('offers a form for the two types that are pages of fields', () => {
      expect(methods.form?.types).toEqual(['standard', 'command']);
    });

    it('leaves the two forms listed rather than folded', () => {
      expect(methods.form?.layout).toBe('flat');
    });

    it('offers an import only for the type that is a folder of files', () => {
      expect(methods.fileImport?.types).toEqual(['skill']);
    });
  });

  /*
   * The reason this builder is generic. MCP servers and hooks do not exist yet,
   * and the shape of the menu once they do is the thing being decided, so it is
   * pinned here rather than discovered on the day.
   */
  describe('once MCP servers and hooks are types too', () => {
    const registry = {
      standard: ARTIFACT_CREATION_ROUTES.standard,
      command: ARTIFACT_CREATION_ROUTES.command,
      skill: ARTIFACT_CREATION_ROUTES.skill,
      mcp: routes({
        agentCanWrite: true,
        formRoute: () => '/create-mcp',
        importable: true,
      }),
      hook: routes({
        agentCanWrite: true,
        formRoute: () => '/create-hook',
      }),
    };
    const methods = buildCreationMethods(registry, [
      'standard',
      'command',
      'skill',
      'mcp',
      'hook',
    ]);

    it('grows the agent entry without adding one', () => {
      expect(methods.agent?.types).toHaveLength(5);
    });

    it('folds the manual branch once its types are a list', () => {
      expect(methods.form).toEqual({
        types: ['standard', 'command', 'mcp', 'hook'],
        layout: 'folded',
      });
    });

    it('grows the import entry without adding one', () => {
      expect(methods.fileImport?.types).toEqual(['skill', 'mcp']);
    });
  });

  describe('at the folding threshold', () => {
    it('still lists two forms', () => {
      const methods = buildCreationMethods({ a: form(), b: form() }, [
        'a',
        'b',
      ]);

      expect(methods.form?.layout).toBe('flat');
    });

    it('folds three', () => {
      const methods = buildCreationMethods(
        { a: form(), b: form(), c: form() },
        ['a', 'b', 'c'],
      );

      expect(methods.form?.layout).toBe('folded');
    });
  });

  describe('when no type answers to a method', () => {
    const methods = buildCreationMethods({ a: form() }, ['a']);

    it('drops the agent entry', () => {
      expect(methods.agent).toBeNull();
    });

    it('drops the samples entry', () => {
      expect(methods.samples).toBeNull();
    });

    it('drops the import entry', () => {
      expect(methods.fileImport).toBeNull();
    });
  });

  it('reports types in the order it was given, not the registry key order', () => {
    const methods = buildCreationMethods(ARTIFACT_CREATION_ROUTES, [
      'skill',
      'command',
      'standard',
    ]);

    expect(methods.agent?.types).toEqual(['skill', 'command', 'standard']);
  });
});

describe('listTypeLabels', () => {
  it('says nothing about an empty list', () => {
    expect(listTypeLabels([])).toBe('');
  });

  it('names one type on its own', () => {
    expect(listTypeLabels(['standards'])).toBe('standards');
  });

  it('joins a pair with "and", not a comma', () => {
    expect(listTypeLabels(['standards', 'commands'])).toBe(
      'standards and commands',
    );
  });

  it('joins the last of several with "and"', () => {
    expect(listTypeLabels(['standards', 'commands', 'skills'])).toBe(
      'standards, commands and skills',
    );
  });
});
