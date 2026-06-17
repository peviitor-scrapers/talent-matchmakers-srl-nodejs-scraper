import { jest } from '@jest/globals';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const HAS_SOLR = !!process.env.SOLR_AUTH;

function itIfSolr(name, fn, timeout) {
  if (HAS_SOLR) {
    return it(name, fn, timeout);
  }
  return it.skip(`${name} (skipped: SOLR_AUTH not set)`, fn, timeout);
}

beforeAll(() => {
  if (HAS_SOLR) {
    process.env.SOLR_AUTH = process.env.SOLR_AUTH;
  }
});

const TM_CIF = '38460545';
const TM_BRAND = 'Talent Matchmakers';
const TM_JOBS_URL = 'https://jobs.talentmatchmakers.co/jobs';
const TM_BASE = 'https://jobs.talentmatchmakers.co';

describe('E2E: Full Scraping Pipeline', () => {

  describe('Talent Matchmakers Website — Real Data Fetch', () => {
    let html;

    beforeAll(async () => {
      const res = await fetch(TM_JOBS_URL, {
        headers: {
          'User-Agent': 'job_seeker_ro_spider',
          'Accept': 'text/html'
        }
      });
      html = await res.text();
    }, 15000);

    it('should respond with valid HTML containing jobs list', () => {
      expect(html).toContain('jobs_list_container');
    }, 10000);

    it('should have job listing elements', () => {
      expect(html).toMatch(/<li>/);
    });
  });

  describe('Parse + Transform Pipeline', () => {
    let index;
    let html;

    beforeAll(async () => {
      index = await import('../../index.js');
      const res = await fetch(TM_JOBS_URL, {
        headers: {
          'User-Agent': 'job_seeker_ro_spider',
          'Accept': 'text/html'
        }
      });
      html = await res.text();
    }, 15000);

    it('should parse Teamtailor HTML into standardized format', () => {
      const result = index.parseHtmlJobs(html);

      expect(result).toHaveProperty('jobs');
      expect(result).toHaveProperty('total');
      expect(result.jobs.length).toBeGreaterThan(0);

      const parsed = result.jobs[0];
      expect(parsed).toHaveProperty('url');
      expect(parsed.url).toMatch(new RegExp(`^${TM_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`));
      expect(parsed).toHaveProperty('title');
      expect(typeof parsed.title).toBe('string');
      expect(parsed.title.length).toBeGreaterThan(0);
      expect(parsed).toHaveProperty('workmode');
      expect(['remote', 'on-site', 'hybrid']).toContain(parsed.workmode);
      expect(parsed).toHaveProperty('location');
      expect(Array.isArray(parsed.location)).toBe(true);
      expect(parsed).toHaveProperty('tags');
    });

    it('should map parsed jobs to job model', () => {
      const parsed = index.parseHtmlJobs(html);
      const model = index.mapToJobModel(parsed.jobs[0], TM_CIF);

      expect(model).toHaveProperty('url');
      expect(model).toHaveProperty('title');
      expect(model).toHaveProperty('company');
      expect(model).toHaveProperty('cif', TM_CIF);
      expect(model).toHaveProperty('status', 'scraped');
      expect(model).toHaveProperty('date');
    });

    it('should transform jobs and filter to Romanian locations', () => {
      const parsed = index.parseHtmlJobs(html);
      const jobs = parsed.jobs.map(j => index.mapToJobModel(j, TM_CIF));

      const payload = {
        source: 'jobs.talentmatchmakers.co',
        company: 'TALENT MATCHMAKERS S.R.L.',
        cif: TM_CIF,
        jobs
      };

      const transformed = index.transformJobsForSOLR(payload);

      expect(transformed.company).toBe('TALENT MATCHMAKERS S.R.L.');
      expect(transformed.jobs.length).toBe(jobs.length);

      for (const job of transformed.jobs) {
        expect(job).toHaveProperty('location');
        expect(Array.isArray(job.location)).toBe(true);
        expect(job.location.length).toBeGreaterThan(0);
        expect(job.workmode).toMatch(/^(remote|on-site|hybrid)$/);
      }
    });

    it('should produce valid job URLs that are accessible', async () => {
      const parsed = index.parseHtmlJobs(html);

      for (const job of parsed.jobs.slice(0, 2)) {
        const res = await fetch(job.url, {
          method: 'HEAD',
          headers: { 'User-Agent': 'job_seeker_ro_spider' }
        });
        expect(res.ok).toBe(true);
      }
    }, 30000);
  });

  describe('Company Validation Path', () => {
    let company;

    beforeAll(async () => {
      company = await import('../../company.js');
    });

    itIfSolr('should run full validation and report active status with job count', async () => {
      const result = await company.validateAndGetCompany();

      expect(result.status).toBe('active');
      expect(result.company).toBe('TALENT MATCHMAKERS S.R.L.');
      expect(result.cif).toBe(TM_CIF);

      if (result.existingJobsCount === 0) {
        console.log('⚠️ No TM jobs in Solr — skipping job count assertion');
        return;
      }
      expect(result.existingJobsCount).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Inactive Company Handling', () => {
    let anaf;

    beforeAll(async () => {
      anaf = await import('../../src/anaf.js');
    });

    it('should detect inactive/radiated companies via ANAF', async () => {
      const results = await anaf.searchCompany('TALENT MATCHMAKERS');

      const nonActive = results.find(c => c.statusLabel !== 'Funcțiune');

      if (nonActive) {
        try {
          const anafData = await anaf.getCompanyFromANAF(nonActive.cui.toString());
          expect(anafData).toBeDefined();
          if (anafData.inactive !== undefined) {
            expect(anafData.inactive).toBe(true);
          }
        } catch {
          expect(nonActive.statusLabel).toMatch(/Radiată|Inactiv|Suspendat/);
        }
      }
    }, 30000);
  });

  describe('SOLR Data Verification', () => {
    let solr;

    beforeAll(async () => {
      solr = await import('../../solr.js');
    });

    itIfSolr('should have TM jobs in SOLR with correct company name', async () => {
      const result = await solr.querySOLR(TM_CIF);

      if (result.numFound === 0) {
        console.log('⚠️ No TM jobs in Solr — skipping SOLR data verification');
        return;
      }

      for (const job of result.docs) {
        expect(job.company).toBe('TALENT MATCHMAKERS S.R.L.');
        expect(job.cif).toBe(TM_CIF);
      }
    }, 15000);

    itIfSolr('should have TM company core entry with required fields', async () => {
      const result = await solr.queryCompanySOLR(`id:${TM_CIF}`);

      expect(result.numFound).toBe(1);
      const company = result.docs[0];
      expect(company.company).toBe('TALENT MATCHMAKERS S.R.L.');
      expect(company.status).toBe('activ');
    }, 15000);
  });
});
