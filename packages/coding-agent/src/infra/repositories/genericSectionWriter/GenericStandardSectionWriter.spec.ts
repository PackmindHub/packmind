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

      const result = GenericStandardSectionWriter.replace(opts);

      it('preserves content before the markers', () => {
        expect(result).toContain(
          '# Some Document\n\nSome initial content here',
        );
      });

      it('replaces content between markers', () => {
        expect(result).toContain('<!-- start: packmind-standards -->');
        expect(result).toContain('<!-- end: packmind-standards -->');
        expect(result).toContain('# Packmind Standards');
        expect(result).toContain(
          GenericStandardSectionWriter.standardsIntroduction,
        );
      });

      it('removes old content between markers', () => {
        expect(result).not.toContain('Old standards content to be replaced');
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

      const result = GenericStandardSectionWriter.replace(opts);

      it('preserves existing content', () => {
        expect(result).toContain('# Some Document');
        expect(result).toContain('Some initial content here');
      });

      it('appends new section with markers', () => {
        expect(result).toContain('<!-- start: packmind-standards -->');
        expect(result).toContain('<!-- end: packmind-standards -->');
        expect(result).toContain('# Packmind Standards');
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

      const result = GenericStandardSectionWriter.replace(opts);

      it('includes the standards section content', () => {
        expect(result).toContain('# Packmind Standards');
        expect(result).toContain(
          GenericStandardSectionWriter.standardsIntroduction,
        );
        expect(result).toContain('## Available Standards');
        expect(result).toContain('- Standard 1');
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

    const result = GenericStandardSectionWriter.generateStandardsSection(opts);

    it('generates section with standards header', () => {
      expect(result).toContain('# Packmind Standards');
    });

    it('includes inline standards content', () => {
      expect(result).toContain(
        GenericStandardSectionWriter.standardsIntroduction,
      );
      expect(result).toContain('## Available Standards');
      expect(result).toContain('- Standard 1');
      expect(result).toContain('- Standard 2');
    });
  });
});
