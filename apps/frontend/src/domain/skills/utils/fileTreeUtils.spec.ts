import { getFileLanguage, getMimeType, isPreviewable } from './fileTreeUtils';

describe('fileTreeUtils', () => {
  describe('getFileLanguage', () => {
    it('returns typescript for .ts files', () => {
      expect(getFileLanguage('src/index.ts')).toBe('typescript');
    });

    it('returns markdown for .md files', () => {
      expect(getFileLanguage('README.md')).toBe('markdown');
    });

    it('returns dockerfile for Dockerfile', () => {
      expect(getFileLanguage('Dockerfile')).toBe('dockerfile');
    });

    it('returns undefined for unknown extensions', () => {
      expect(getFileLanguage('file.xyz')).toBeUndefined();
    });
  });

  describe('isPreviewable', () => {
    it('returns true for text files', () => {
      expect(isPreviewable('README.md')).toBe(true);
    });

    it('returns true for code files', () => {
      expect(isPreviewable('index.ts')).toBe(true);
    });

    it('returns false for binary files', () => {
      expect(isPreviewable('image.png')).toBe(false);
    });

    it('returns false for PDF files', () => {
      expect(isPreviewable('document.pdf')).toBe(false);
    });
  });

  describe('getMimeType', () => {
    describe('with image files', () => {
      it('returns image/png for .png files', () => {
        expect(getMimeType('image.png')).toBe('image/png');
      });

      it('returns image/jpeg for .jpg files', () => {
        expect(getMimeType('photo.jpg')).toBe('image/jpeg');
      });

      it('returns image/jpeg for .jpeg files', () => {
        expect(getMimeType('photo.jpeg')).toBe('image/jpeg');
      });

      it('returns image/gif for .gif files', () => {
        expect(getMimeType('animation.gif')).toBe('image/gif');
      });

      it('returns image/svg+xml for .svg files', () => {
        expect(getMimeType('icon.svg')).toBe('image/svg+xml');
      });
    });

    describe('with document files', () => {
      it('returns application/pdf for .pdf files', () => {
        expect(getMimeType('document.pdf')).toBe('application/pdf');
      });

      it('returns correct MIME type for .docx files', () => {
        expect(getMimeType('document.docx')).toBe(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        );
      });

      it('returns correct MIME type for .xlsx files', () => {
        expect(getMimeType('spreadsheet.xlsx')).toBe(
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
      });
    });

    describe('with archive files', () => {
      it('returns application/zip for .zip files', () => {
        expect(getMimeType('archive.zip')).toBe('application/zip');
      });

      it('returns application/gzip for .gz files', () => {
        expect(getMimeType('archive.gz')).toBe('application/gzip');
      });
    });

    describe('with font files', () => {
      it('returns font/ttf for .ttf files', () => {
        expect(getMimeType('font.ttf')).toBe('font/ttf');
      });

      it('returns font/woff2 for .woff2 files', () => {
        expect(getMimeType('font.woff2')).toBe('font/woff2');
      });
    });

    describe('with unknown extensions', () => {
      it('returns application/octet-stream for unknown extensions', () => {
        expect(getMimeType('file.xyz')).toBe('application/octet-stream');
      });

      it('returns application/octet-stream for files without extension', () => {
        expect(getMimeType('noextension')).toBe('application/octet-stream');
      });
    });

    describe('with nested paths', () => {
      it('extracts extension from full path', () => {
        expect(getMimeType('path/to/document.pdf')).toBe('application/pdf');
      });

      it('handles deeply nested paths', () => {
        expect(getMimeType('a/b/c/d/image.png')).toBe('image/png');
      });
    });
  });
});
