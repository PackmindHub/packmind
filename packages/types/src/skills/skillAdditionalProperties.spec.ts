import {
  canonicalJsonStringify,
  camelToKebab,
  CAMEL_TO_YAML_KEY,
  CLAUDE_CODE_ADDITIONAL_FIELDS,
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
      disableModelInvocation: 'disable-model-invocation',
      userInvocable: 'user-invocable',
      model: 'model',
      context: 'context',
      agent: 'agent',
      effort: 'effort',
      hooks: 'hooks',
    });
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
});

describe('filterAdditionalProperties', () => {
  it('keeps only keys in the supported list', () => {
    const props = {
      disableModelInvocation: true,
      model: 'opus',
      argumentHint: 'hint',
      effort: 'high',
    };
    expect(
      filterAdditionalProperties(props, COPILOT_ADDITIONAL_FIELDS),
    ).toEqual({
      argumentHint: 'hint',
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
    };
    expect(filterAdditionalProperties(props, CURSOR_ADDITIONAL_FIELDS)).toEqual(
      {
        disableModelInvocation: true,
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
});
