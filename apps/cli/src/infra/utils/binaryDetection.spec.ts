import {
  isBinaryExtension,
  isBinaryBuffer,
  isBinaryFile,
} from './binaryDetection';

describe('binaryDetection', () => {
  describe('isBinaryExtension', () => {
    it.each(['.png', '.pdf', '.woff2', '.zip'])(
      'detects %s as binary extension',
      (ext) => {
        expect(isBinaryExtension(`file${ext}`)).toBe(true);
      },
    );

    it.each(['.ts', '.md', '.json', '.txt'])(
      'returns false for %s extension',
      (ext) => {
        expect(isBinaryExtension(`file${ext}`)).toBe(false);
      },
    );

    it.each(['.PNG', '.Jpg'])(
      'handles case-insensitive extension %s',
      (ext) => {
        expect(isBinaryExtension(`image${ext}`)).toBe(true);
      },
    );
  });

  describe('isBinaryBuffer', () => {
    it('detects null bytes as binary', () => {
      const buffer = Buffer.from([0x48, 0x65, 0x00, 0x6c]);

      expect(isBinaryBuffer(buffer)).toBe(true);
    });

    it('returns false for text-only content', () => {
      const buffer = Buffer.from('Hello, world!', 'utf-8');

      expect(isBinaryBuffer(buffer)).toBe(false);
    });

    it('only checks first 8000 bytes', () => {
      const buffer = Buffer.alloc(9000, 0x41);
      buffer[8500] = 0x00;

      expect(isBinaryBuffer(buffer)).toBe(false);
    });
  });

  describe('isBinaryFile', () => {
    it('detects binary by extension even without null bytes', () => {
      const buffer = Buffer.from('not really binary content', 'utf-8');

      expect(isBinaryFile('icon.png', buffer)).toBe(true);
    });

    it('detects binary by buffer content even with text extension', () => {
      const buffer = Buffer.from([0x48, 0x65, 0x00, 0x6c]);

      expect(isBinaryFile('file.txt', buffer)).toBe(true);
    });

    it('returns false for text file with text content', () => {
      const buffer = Buffer.from('const x = 1;', 'utf-8');

      expect(isBinaryFile('code.ts', buffer)).toBe(false);
    });
  });
});
