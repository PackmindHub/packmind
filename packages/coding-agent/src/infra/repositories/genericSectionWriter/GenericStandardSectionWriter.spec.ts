import { GenericStandardSectionWriter } from './GenericStandardSectionWriter';

describe('GenericStandardSectionWriter', () => {
  describe('replace', () => {
    describe('when content has existing comment markers', () => {
      const currentContent = `# Some Document

Some initial content here

<!-- start: packmind-standards -->
Old standards content to be replaced
This should all be replaced
<!-- end: packmind-standards -->

Some content after`;

      const opts = {
        agentName: 'TestAgent',
        repoName: 'test-repo',
        currentContent,
        commentMarker: 'packmind-standards',
        standardsSection: '* standard A: a good standard',
      };

      let result: string;

      beforeEach(() => {
        result = GenericStandardSectionWriter.replace(opts);
      });

      it('preserves content before the markers', () => {
        expect(result).toContain(
          '# Some Document\n\nSome initial content here',
        );
      });

      it('includes the start marker', () => {
        expect(result).toContain('<!-- start: packmind-standards -->');
      });

      it('includes the end marker', () => {
        expect(result).toContain('<!-- end: packmind-standards -->');
      });

      it('includes the Packmind Standards header', () => {
        expect(result).toContain('# Packmind Standards');
      });

      it('includes the standards introduction', () => {
        expect(result).toContain(
          GenericStandardSectionWriter.standardsIntroduction,
        );
      });

      it('removes old content between markers', () => {
        expect(result).not.toContain('Old standards content to be replaced');
      });

      it('removes all previous content between markers', () => {
        expect(result).not.toContain('This should all be replaced');
      });

      it('preserves content after the markers', () => {
        expect(result).toContain('Some content after');
      });
    });

    describe('when content has no existing comment markers', () => {
      const currentContent = `# Some Document

Some initial content here`;

      const opts = {
        agentName: 'TestAgent',
        repoName: 'test-repo',
        standardsSection: '* standard A: a good standard',
        currentContent,
        commentMarker: 'packmind-standards',
      };

      let result: string;

      beforeEach(() => {
        result = GenericStandardSectionWriter.replace(opts);
      });

      it('preserves the document header', () => {
        expect(result).toContain('# Some Document');
      });

      it('preserves the initial content', () => {
        expect(result).toContain('Some initial content here');
      });

      it('appends the start marker', () => {
        expect(result).toContain('<!-- start: packmind-standards -->');
      });

      it('appends the end marker', () => {
        expect(result).toContain('<!-- end: packmind-standards -->');
      });

      it('includes the Packmind Standards header', () => {
        expect(result).toContain('# Packmind Standards');
      });

      it('includes the standards introduction', () => {
        expect(result).toContain(
          GenericStandardSectionWriter.standardsIntroduction,
        );
      });
    });

    describe('when using standardsSection instead of standardsIndexPath', () => {
      const currentContent = `# Some Document`;

      const opts = {
        agentName: 'TestAgent',
        repoName: 'test-repo',
        standardsSection:
          '## Available Standards\n\n- Standard 1\n- Standard 2',
        currentContent,
        commentMarker: 'packmind-standards',
      };

      let result: string;

      beforeEach(() => {
        result = GenericStandardSectionWriter.replace(opts);
      });

      it('includes the Packmind Standards header', () => {
        expect(result).toContain('# Packmind Standards');
      });

      it('includes the standards introduction', () => {
        expect(result).toContain(
          GenericStandardSectionWriter.standardsIntroduction,
        );
      });

      it('includes the available standards section', () => {
        expect(result).toContain('## Available Standards');
      });

      it('includes the first standard item', () => {
        expect(result).toContain('- Standard 1');
      });

      it('includes the second standard item', () => {
        expect(result).toContain('- Standard 2');
      });
    });
  });

  describe('generateStandardsSection', () => {
    const opts = {
      agentName: 'TestAgent',
      repoName: 'test-repo',
      standardsSection: '## Available Standards\n\n- Standard 1\n- Standard 2',
    };

    let result: string;

    beforeEach(() => {
      result = GenericStandardSectionWriter.generateStandardsSection(opts);
    });

    it('generates section with standards header', () => {
      expect(result).toContain('# Packmind Standards');
    });

    it('includes the standards introduction', () => {
      expect(result).toContain(
        GenericStandardSectionWriter.standardsIntroduction,
      );
    });

    it('includes the available standards section', () => {
      expect(result).toContain('## Available Standards');
    });

    it('includes the first standard item', () => {
      expect(result).toContain('- Standard 1');
    });

    it('includes the second standard item', () => {
      expect(result).toContain('- Standard 2');
    });
  });
});
