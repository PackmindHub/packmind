import { DetectedSkill } from './collectSkillsFromFiles';
import {
  findOversizedPayload,
  MAX_UPLOAD_PAYLOAD_BYTES,
  readSkillFileContents,
  SkillUploadFile,
} from './readSkillFileContents';

function skillOf(
  ...files: [relativePath: string, file: File][]
): DetectedSkill {
  return {
    name: 'documentation',
    files: files.map(([relativePath, file]) => ({ relativePath, file })),
    totalSize: files.reduce((sum, [, file]) => sum + file.size, 0),
  };
}

const base64Of = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes));

/** `size` bytes of printable text with a null byte planted at `nullAt`. */
function bytesWithNullByte(size: number, nullAt: number): Uint8Array {
  const bytes = new Uint8Array(size).fill(0x61);
  bytes[nullAt] = 0x00;
  return bytes;
}

describe('readSkillFileContents', () => {
  describe('when the file is text', () => {
    it('produces a utf-8 payload with default permissions', async () => {
      const result = await readSkillFileContents(
        skillOf(['SKILL.md', new File(['# Hello'], 'SKILL.md')]),
      );

      expect(result).toEqual([
        {
          path: 'SKILL.md',
          content: '# Hello',
          permissions: 'rw-r--r--',
          isBase64: false,
        },
      ]);
    });

    it('normalizes CRLF line endings to LF', async () => {
      const result = await readSkillFileContents(
        skillOf(['SKILL.md', new File(['a\r\nb'], 'SKILL.md')]),
      );

      expect(result[0].content).toBe('a\nb');
    });

    it('normalizes a lone CR to LF, as the CLI does', async () => {
      const result = await readSkillFileContents(
        skillOf(['SKILL.md', new File(['a\rb'], 'SKILL.md')]),
      );

      expect(result[0].content).toBe('a\nb');
    });
  });

  describe('when the file has a binary extension', () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x01, 0x02]);

    it('flags it as base64', async () => {
      const result = await readSkillFileContents(
        skillOf(['logo.png', new File([bytes], 'logo.png')]),
      );

      expect(result[0].isBase64).toBe(true);
    });

    it('encodes its content as base64', async () => {
      const result = await readSkillFileContents(
        skillOf(['logo.png', new File([bytes], 'logo.png')]),
      );

      expect(result[0].content).toBe(base64Of(bytes));
    });

    it('matches the extension case-insensitively', async () => {
      const result = await readSkillFileContents(
        skillOf(['LOGO.PNG', new File([bytes], 'LOGO.PNG')]),
      );

      expect(result[0].isBase64).toBe(true);
    });

    it('covers the extensions the CLI treats as binary', async () => {
      const result = await readSkillFileContents(
        skillOf(['cache.sqlite', new File([bytes], 'cache.sqlite')]),
      );

      expect(result[0].isBase64).toBe(true);
    });
  });

  describe('when the file contains a null byte in the first 8000 bytes', () => {
    it('flags it as base64', async () => {
      const bytes = bytesWithNullByte(20, 5);
      const result = await readSkillFileContents(
        skillOf(['data.unknown', new File([bytes], 'data.unknown')]),
      );

      expect(result[0].isBase64).toBe(true);
    });
  });

  describe('when the null byte comes after the first 8000 bytes', () => {
    it('leaves it as text, matching the CLI', async () => {
      const bytes = bytesWithNullByte(8100, 8050);
      const result = await readSkillFileContents(
        skillOf(['long.md', new File([bytes], 'long.md')]),
      );

      expect(result[0].isBase64).toBe(false);
    });
  });

  describe('when a file sits in a subdirectory', () => {
    it('keeps the relative path as the payload path', async () => {
      const result = await readSkillFileContents(
        skillOf(['references/guide.md', new File(['x'], 'guide.md')]),
      );

      expect(result[0].path).toBe('references/guide.md');
    });
  });

  describe('when the skill has several files', () => {
    it('returns them in order', async () => {
      const result = await readSkillFileContents(
        skillOf(
          ['SKILL.md', new File(['a'], 'SKILL.md')],
          ['references/guide.md', new File(['b'], 'guide.md')],
          ['scripts/run.sh', new File(['c'], 'run.sh')],
        ),
      );

      expect(result.map((file) => file.path)).toEqual([
        'SKILL.md',
        'references/guide.md',
        'scripts/run.sh',
      ]);
    });
  });

  describe('when the skill has no files', () => {
    it('returns an empty payload', async () => {
      expect(await readSkillFileContents(skillOf())).toEqual([]);
    });
  });
});

describe('findOversizedPayload', () => {
  const payloadOf = (contentLength: number): SkillUploadFile[] => [
    {
      path: 'SKILL.md',
      content: 'a'.repeat(contentLength),
      permissions: 'rw-r--r--',
      isBase64: false,
    },
  ];

  describe('when the payload fits', () => {
    it('returns no error', () => {
      expect(findOversizedPayload(payloadOf(1000))).toBeUndefined();
    });
  });

  describe('when the payload is over the limit', () => {
    const oversized = payloadOf(MAX_UPLOAD_PAYLOAD_BYTES + 1);

    it('returns an error naming the limit', () => {
      expect(findOversizedPayload(oversized)).toContain('15.0 MB limit');
    });

    it('returns an error naming the encoded size', () => {
      expect(findOversizedPayload(oversized)).toMatch(/is 15\.\d MB once/);
    });
  });

  // The on-disk check in collectSkillsFromFiles cannot see this: the bytes it
  // measures fit, and only the base64 the transport needs pushes them over.
  describe('when base64 encoding is what pushes it over', () => {
    const underLimitOnDisk = MAX_UPLOAD_PAYLOAD_BYTES - 1024;
    const encoded: SkillUploadFile[] = [
      {
        path: 'assets/logo.png',
        // 4 characters per 3 bytes, so bytes that fit become a body that does not.
        content: 'a'.repeat(Math.ceil((underLimitOnDisk * 4) / 3)),
        permissions: 'rw-r--r--',
        isBase64: true,
      },
    ];

    it('rejects the payload', () => {
      expect(findOversizedPayload(encoded)).toBeDefined();
    });
  });
});
