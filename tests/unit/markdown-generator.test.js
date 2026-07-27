import { jest } from '@jest/globals';

describe('markdown-generator.js Component Tests', () => {
  let markdownGenerator;

  beforeAll(async () => {
    markdownGenerator = await import('../../scraper/markdown-generator.js');
  });

  describe('generateJobsMarkdown', () => {
    const companyData = {
      id: '38460545',
      company: 'TALENT MATCHMAKERS S.R.L.',
      brand: 'TALENT MATCHMAKERS',
      status: 'activ',
      location: ['Cluj-Napoca'],
      website: ['https://talentmatchmakers.co'],
      career: ['https://jobs.talentmatchmakers.co'],
      lastScraped: '2026-07-27'
    };

    it('should generate markdown with company header', () => {
      const result = markdownGenerator.generateJobsMarkdown(companyData, []);

      expect(result).toContain('# TALENT MATCHMAKERS S.R.L.');
    });

    it('should include company info table', () => {
      const result = markdownGenerator.generateJobsMarkdown(companyData, []);

      expect(result).toContain('| Field | Value |');
      expect(result).toContain('| CIF | 38460545 |');
      expect(result).toContain('| Brand | TALENT MATCHMAKERS |');
      expect(result).toContain('| Status | activ |');
    });

    it('should include job count in header', () => {
      const jobs = [
        { url: 'https://test.com/1', title: 'Job 1', status: 'scraped' }
      ];

      const result = markdownGenerator.generateJobsMarkdown(companyData, jobs);

      expect(result).toContain('Current Job Listings (1)');
    });

    it('should list job titles', () => {
      const jobs = [
        { url: 'https://test.com/1', title: 'Senior Developer', status: 'scraped' },
        { url: 'https://test.com/2', title: 'Junior Developer', status: 'scraped' }
      ];

      const result = markdownGenerator.generateJobsMarkdown(companyData, jobs);

      expect(result).toContain('### Senior Developer');
      expect(result).toContain('### Junior Developer');
    });

    it('should include job URLs', () => {
      const jobs = [
        { url: 'https://test.com/1', title: 'Job 1', status: 'scraped' }
      ];

      const result = markdownGenerator.generateJobsMarkdown(companyData, jobs);

      expect(result).toContain('https://test.com/1');
    });

    it('should include workmode when present', () => {
      const jobs = [
        { url: 'https://test.com/1', title: 'Job 1', workmode: 'hybrid', status: 'scraped' }
      ];

      const result = markdownGenerator.generateJobsMarkdown(companyData, jobs);

      expect(result).toContain('**Work Mode:** hybrid');
    });

    it('should include location when present', () => {
      const jobs = [
        { url: 'https://test.com/1', title: 'Job 1', location: ['Bucharest'], status: 'scraped' }
      ];

      const result = markdownGenerator.generateJobsMarkdown(companyData, jobs);

      expect(result).toContain('**Location:** Bucharest');
    });

    it('should include tags when present', () => {
      const jobs = [
        { url: 'https://test.com/1', title: 'Job 1', tags: ['Java', 'Spring'], status: 'scraped' }
      ];

      const result = markdownGenerator.generateJobsMarkdown(companyData, jobs);

      expect(result).toContain('**Tags:** Java, Spring');
    });

    it('should handle empty jobs array', () => {
      const result = markdownGenerator.generateJobsMarkdown(companyData, []);

      expect(result).toContain('Current Job Listings (0)');
    });

    it('should escape markdown in company name', () => {
      const specialCompany = { ...companyData, company: 'Test *Company* [Name]' };
      const result = markdownGenerator.generateJobsMarkdown(specialCompany, []);

      expect(result).toContain('\\*Company\\*');
      expect(result).toContain('\\[Name\\]');
    });

    it('should escape markdown in job titles', () => {
      const jobs = [
        { url: 'https://test.com/1', title: 'Job [Senior] *Level*', status: 'scraped' }
      ];

      const result = markdownGenerator.generateJobsMarkdown(companyData, jobs);

      expect(result).toContain('\\[Senior\\]');
      expect(result).toContain('\\*Level\\*');
    });

    it('should include generation timestamp', () => {
      const result = markdownGenerator.generateJobsMarkdown(companyData, []);

      expect(result).toContain('_Generated:');
    });
  });
});
