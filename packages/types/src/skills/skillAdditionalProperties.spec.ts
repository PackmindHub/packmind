import {
  canonicalJsonStringify,
  camelToKebab,
  CAMEL_TO_YAML_KEY,
  CLAUDE_CODE_ADDITIONAL_FIELDS,
  CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER,
  COPILOT_ADDITIONAL_FIELDS,
  CURSOR_ADDITIONAL_FIELDS,
  filterAdditionalProperties,
  sortAdditionalPropertiesKeys,
} from './skillAdditionalProperties';

describe('canonicalJsonStringify', () => {
  describe('when keys are in different orders', () => {
    it('produces identical output regardless of key insertion order', () => {
      expect(canonicalJsonStringify({ z: 1, a: 2 })).toBe('{"a":2,"z":1}');
    });

    it('produces identical output for already sorted keys', () => {
      expect(canonicalJsonStringify({ a: 2, z: 1 })).toBe('{"a":2,"z":1}');
    });
  });

  it('sorts nested object keys recursively', () => {
    expect(canonicalJsonStringify({ b: { d: 1, c: 2 }, a: 3 })).toBe(
      '{"a":3,"b":{"c":2,"d":1}}',
    );
  });

  it('preserves array element order while sorting object keys within', () => {
    expect(canonicalJsonStringify([{ b: 1, a: 2 }, 3])).toBe(
      '[{"a":2,"b":1},3]',
    );
  });

  it('coalesces undefined to null', () => {
    expect(canonicalJsonStringify(undefined)).toBe('null');
  });

  it('coalesces null to null', () => {
    expect(canonicalJsonStringify(null)).toBe('null');
  });

  it('serializes string primitives', () => {
    expect(canonicalJsonStringify('hello')).toBe('"hello"');
  });

  it('serializes number primitives', () => {
    expect(canonicalJsonStringify(42)).toBe('42');
  });

  it('serializes boolean primitives', () => {
    expect(canonicalJsonStringify(true)).toBe('true');
  });
});

describe('camelToKebab', () => {
  it('converts multi-word camelCase to kebab-case', () => {
    expect(camelToKebab('argumentHint')).toBe('argument-hint');
  });

  it('converts camelCase with multiple uppercase letters', () => {
    expect(camelToKebab('disableModelInvocation')).toBe(
      'disable-model-invocation',
    );
  });

  it('returns single-word strings unchanged', () => {
    expect(camelToKebab('model')).toBe('model');
  });
});

describe('CAMEL_TO_YAML_KEY', () => {
  it('maps every CLAUDE_CODE_ADDITIONAL_FIELDS camel value back to its yaml key', () => {
    for (const [yaml, camel] of Object.entries(CLAUDE_CODE_ADDITIONAL_FIELDS)) {
      expect(CAMEL_TO_YAML_KEY[camel]).toBe(yaml);
    }
  });

  it('contains exactly the expected key mappings', () => {
    expect(CAMEL_TO_YAML_KEY).toEqual({
      argumentHint: 'argument-hint',
      arguments: 'arguments',
      whenToUse: 'when_to_use',
      disableModelInvocation: 'disable-model-invocation',
      userInvocable: 'user-invocable',
      model: 'model',
      effort: 'effort',
      context: 'context',
      agent: 'agent',
      hooks: 'hooks',
      paths: 'paths',
      shell: 'shell',
      disallowedTools: 'disallowed-tools',
    });
  });
});

describe('CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER', () => {
  it('has disallowedTools as the last element', () => {
    const last =
      CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER[
        CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER.length - 1
      ];
    expect(last).toBe('disallowedTools');
  });

  it('places shell immediately before disallowedTools', () => {
    const idx = CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER.indexOf('disallowedTools');
    expect(CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER[idx - 1]).toBe('shell');
  });
});

describe('sortAdditionalPropertiesKeys', () => {
  it('sorts known fields in canonical order', () => {
    const props = { hooks: 'v', model: 'opus', argumentHint: 'hint' };
    const result = sortAdditionalPropertiesKeys(props);
    expect(result.map(([k]) => k)).toEqual(['argumentHint', 'model', 'hooks']);
  });

  it('places unknown fields after known fields, sorted alphabetically', () => {
    const props = { zCustom: 1, model: 'opus', aCustom: 2 };
    const result = sortAdditionalPropertiesKeys(props);
    expect(result.map(([k]) => k)).toEqual(['model', 'aCustom', 'zCustom']);
  });

  it('preserves values alongside keys', () => {
    expect(
      sortAdditionalPropertiesKeys({ model: 'opus', hooks: { pre: 'echo' } }),
    ).toEqual([
      ['model', 'opus'],
      ['hooks', { pre: 'echo' }],
    ]);
  });

  it('sorts whenToUse, paths, and shell in their canonical positions', () => {
    const props = {
      shell: 'bash',
      argumentHint: '[file]',
      paths: ['src/**/*.ts'],
      whenToUse: 'when editing TypeScript files',
    };
    const result = sortAdditionalPropertiesKeys(props);
    expect(result.map(([k]) => k)).toEqual([
      'argumentHint',
      'whenToUse',
      'paths',
      'shell',
    ]);
  });

  it('places arguments immediately after argumentHint in canonical order', () => {
    const props = {
      whenToUse: 'when editing TypeScript files',
      argumentHint: '[file] [format]',
      arguments: 'file format',
      shell: 'bash',
    };
    const result = sortAdditionalPropertiesKeys(props);
    expect(result.map(([k]) => k)).toEqual([
      'argumentHint',
      'arguments',
      'whenToUse',
      'shell',
    ]);
  });

  it('places disallowedTools after shell in canonical order', () => {
    const props = {
      disallowedTools: ['Monitor', 'AskUserQuestions'],
      shell: 'bash',
      model: 'opus',
    };
    const result = sortAdditionalPropertiesKeys(props);
    expect(result.map(([k]) => k)).toEqual([
      'model',
      'shell',
      'disallowedTools',
    ]);
  });
});

describe('filterAdditionalProperties', () => {
  it('keeps only keys in the supported list', () => {
    const props = {
      disableModelInvocation: true,
      model: 'opus',
      argumentHint: 'hint',
      context: 'fork',
      effort: 'high',
    };
    expect(
      filterAdditionalProperties(props, COPILOT_ADDITIONAL_FIELDS),
    ).toEqual({
      argumentHint: 'hint',
      context: 'fork',
      disableModelInvocation: true,
    });
  });

  describe('when no properties match', () => {
    it('returns empty object', () => {
      const props = { model: 'opus', effort: 'high' };
      expect(
        filterAdditionalProperties(props, CURSOR_ADDITIONAL_FIELDS),
      ).toEqual({});
    });
  });

  it('filters correctly for Cursor supported fields', () => {
    const props = {
      disableModelInvocation: true,
      argumentHint: 'hint',
      userInvocable: true,
      paths: ['src/**/*.ts'],
    };
    expect(filterAdditionalProperties(props, CURSOR_ADDITIONAL_FIELDS)).toEqual(
      {
        disableModelInvocation: true,
        paths: ['src/**/*.ts'],
      },
    );
  });

  describe('when all properties match the supported list', () => {
    it('returns all properties', () => {
      const props = { disableModelInvocation: false };
      expect(
        filterAdditionalProperties(props, COPILOT_ADDITIONAL_FIELDS),
      ).toEqual({
        disableModelInvocation: false,
      });
    });
  });

  describe('cross-agent isolation for arguments, paths, and context', () => {
    const props = {
      arguments: 'file format',
      paths: ['src/**/*.ts'],
      context: 'fork',
    };

    it('keeps paths but drops arguments and context for Cursor', () => {
      expect(
        filterAdditionalProperties(props, CURSOR_ADDITIONAL_FIELDS),
      ).toEqual({
        paths: ['src/**/*.ts'],
      });
    });

    it('keeps context but drops arguments and paths for Copilot', () => {
      expect(
        filterAdditionalProperties(props, COPILOT_ADDITIONAL_FIELDS),
      ).toEqual({
        context: 'fork',
      });
    });
  });
});
