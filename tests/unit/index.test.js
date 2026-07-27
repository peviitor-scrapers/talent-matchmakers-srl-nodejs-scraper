import { jest } from '@jest/globals';

function teamtailorHtml(jobsHtml) {
  return `<!DOCTYPE html><html><body><ul id="jobs_list_container">${jobsHtml}</ul></body></html>`;
}

function jobLi(href, title, spans) {
  const spanHtml = spans ? spans.map(s => `<span>${s}</span>`).join('') : '';
  return `<li><a data-turbo="false" href="${href}">${title}</a><span class="text-base">${spanHtml}</span></li>`;
}

describe('index.js Component Tests', () => {
  let index;

  beforeAll(async () => {
    index = await import('../../scraper/index.js');
  });

  describe('transformJobsForSOLR', () => {
    it('should filter locations to only Romanian cities', () => {
      const payload = {
        jobs: [
          { url: 'https://test.com/1', title: 'Job 1', location: ['România'] },
          { url: 'https://test.com/2', title: 'Job 2', location: ['Bucharest'] },
          { url: 'https://test.com/3', title: 'Job 3', location: ['Bulgaria'] },
          { url: 'https://test.com/4', title: 'Job 4', location: ['Cluj-Napoca'] },
          { url: 'https://test.com/5', title: 'Job 5', location: [] }
        ]
      };

      const result = index.transformJobsForSOLR(payload);

      expect(result.jobs[0].location).toEqual(['România']);
      expect(result.jobs[1].location).toEqual(['Bucharest']);
      expect(result.jobs[2].location).toEqual(['România']);
      expect(result.jobs[3].location).toEqual(['Cluj-Napoca']);
      expect(result.jobs[4].location).toEqual(['România']);
    });

    it('should keep company uppercase', () => {
      const payload = {
        source: 'jobs.talentmatchmakers.co',
        company: 'talent matchmakers s.r.l.',
        cif: '38460545',
        jobs: [
          { url: 'https://test.com/1', title: 'Job 1', company: 'talent matchmakers', cif: '38460545' }
        ]
      };

      const result = index.transformJobsForSOLR(payload);

      expect(result.company).toBe('TALENT MATCHMAKERS S.R.L.');
    });

    it('should normalize workmode values', () => {
      const payload = {
        jobs: [
          { url: 'https://test.com/1', title: 'Job 1', workmode: 'Remote' },
          { url: 'https://test.com/2', title: 'Job 2', workmode: 'ON-SITE' },
          { url: 'https://test.com/3', title: 'Job 3', workmode: 'Hybrid' },
          { url: 'https://test.com/4', title: 'Job 4', workmode: 'hybrid' }
        ]
      };

      const result = index.transformJobsForSOLR(payload);

      expect(result.jobs[0].workmode).toBe('remote');
      expect(result.jobs[1].workmode).toBe('on-site');
      expect(result.jobs[2].workmode).toBe('hybrid');
      expect(result.jobs[3].workmode).toBe('hybrid');
    });

    it('should handle empty jobs array', () => {
      const result = index.transformJobsForSOLR({ jobs: [] });
      expect(result.jobs).toEqual([]);
    });
  });

  describe('mapToJobModel', () => {
    it('should map raw job to job model format', () => {
      const rawJob = {
        url: 'https://jobs.talentmatchmakers.co/jobs/123',
        title: 'Senior Developer',
        location: ['Bucharest'],
        tags: ['Java', 'Spring'],
        workmode: 'hybrid'
      };

      const COMPANY_NAME = 'TALENT MATCHMAKERS S.R.L.';
      const COMPANY_CIF = '38460545';

      const result = index.mapToJobModel(rawJob, COMPANY_CIF, COMPANY_NAME);

      expect(result.url).toBe(rawJob.url);
      expect(result.title).toBe(rawJob.title);
      expect(result.company).toBe(COMPANY_NAME);
      expect(result.cif).toBe(COMPANY_CIF);
      expect(result.location).toEqual(rawJob.location);
      expect(result.tags).toEqual(rawJob.tags);
      expect(result.workmode).toBe(rawJob.workmode);
      expect(result.status).toBe('scraped');
      expect(result.date).toBeDefined();
    });

    it('should remove undefined fields', () => {
      const rawJob = {
        url: 'https://test.com/1',
        title: 'Job 1'
      };

      const result = index.mapToJobModel(rawJob, '38460545');

      expect(result.location).toBeUndefined();
      expect(result.tags).toBeUndefined();
      expect(result.workmode).toBeUndefined();
    });

    it('should handle missing title', () => {
      const rawJob = { url: 'https://test.com/1' };

      const result = index.mapToJobModel(rawJob, '38460545');

      expect(result.title).toBeUndefined();
      expect(result.url).toBe('https://test.com/1');
    });
  });

  describe('parseHtmlJobs', () => {
    it('should parse a single job from Teamtailor HTML', () => {
      const html = teamtailorHtml(
        jobLi('/jobs/123', 'Senior Developer', ['Bucharest', '·', 'Hybrid'])
      );

      const result = index.parseHtmlJobs(html);

      expect(result.jobs).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.jobs[0].title).toBe('Senior Developer');
      expect(result.jobs[0].url).toBe('https://jobs.talentmatchmakers.co/jobs/123');
      expect(result.jobs[0].location).toEqual(['Bucharest']);
      expect(result.jobs[0].workmode).toBe('hybrid');
      expect(result.jobs[0].tags).toEqual([]);
    });

    it('should handle empty job list (no li elements)', () => {
      const html = teamtailorHtml('');

      const result = index.parseHtmlJobs(html);

      expect(result.jobs).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle missing jobs_container', () => {
      const html = '<html><body></body></html>';

      const result = index.parseHtmlJobs(html);

      expect(result.jobs).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should parse remote workmode', () => {
      const html = teamtailorHtml(
        jobLi('/jobs/456', 'Remote Dev', ['Remote', '·', 'Bucharest'])
      );

      const result = index.parseHtmlJobs(html);

      expect(result.jobs[0].workmode).toBe('remote');
    });

    it('should parse on-site workmode', () => {
      const html = teamtailorHtml(
        jobLi('/jobs/789', 'Office Dev', ['Bucharest', '·', 'On-site'])
      );

      const result = index.parseHtmlJobs(html);

      expect(result.jobs[0].workmode).toBe('on-site');
    });

    it('should default to hybrid when no workmode span', () => {
      const html = teamtailorHtml(
        jobLi('/jobs/101', 'Default Mode', [])
      );

      const result = index.parseHtmlJobs(html);

      expect(result.jobs[0].workmode).toBe('hybrid');
    });

    it('should use defaultLocation when no location span', () => {
      const html = teamtailorHtml(
        jobLi('/jobs/202', 'No Location', [])
      );

      const result = index.parseHtmlJobs(html);

      expect(result.jobs[0].location).toEqual(['Cluj-Napoca']);
    });

    it('should parse multiple locations from spans', () => {
      const html = teamtailorHtml(
        jobLi('/jobs/303', 'Multi Location', ['Bucharest', '·', 'Cluj-Napoca', '·', 'Hybrid'])
      );

      const result = index.parseHtmlJobs(html);

      expect(result.jobs[0].location).toContain('Bucharest');
      expect(result.jobs[0].location).toContain('Cluj-Napoca');
      expect(result.jobs[0].workmode).toBe('hybrid');
    });

    it('should skip list items with empty title', () => {
      const html = teamtailorHtml(
        jobLi('/jobs/empty', '', []) + jobLi('/jobs/real', 'Real Job', ['Bucharest', '·', 'Remote'])
      );

      const result = index.parseHtmlJobs(html);

      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].title).toBe('Real Job');
    });

    it('should handle absolute href URLs', () => {
      const html = teamtailorHtml(
        `<li><a data-turbo="false" href="https://custom.example.com/job/999">Custom URL</a><span class="text-base"></span></li>`
      );

      const result = index.parseHtmlJobs(html);

      expect(result.jobs[0].url).toBe('https://custom.example.com/job/999');
    });
  });
});
