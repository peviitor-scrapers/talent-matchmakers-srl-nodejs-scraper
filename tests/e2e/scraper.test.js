import fetch from 'node-fetch';

import companyConfig from '../../scraper/config/company.js';

const API_BASE = 'https://api.peviitor.ro/v1';
const CAREER_URL = companyConfig.career[0];
const CAREER_ORIGIN = new URL(CAREER_URL).origin;

describe('E2E Tests: Scraper Flow', () => {
  let index;

  beforeAll(async () => {
    index = await import('../../scraper/index.js');
  });

  it('fetches and parses the live careers page', async () => {
    const html = await index.fetchJobsHtml();
    expect(html.length).toBeGreaterThan(0);

    const { jobs, total } = index.parseHtmlJobs(html);
    expect(total).toBe(jobs.length);

    if (/["@]type"\s*:\s*"ItemList"|class="job-row"|jobs_list_container/.test(html)) {
      expect(jobs.length).toBeGreaterThan(0);
    }

    for (const job of jobs) {
      expect(job.title.length).toBeGreaterThan(0);
      expect(job.url.startsWith(CAREER_ORIGIN)).toBe(true);
      expect(() => new URL(job.url)).not.toThrow();
      expect(Array.isArray(job.location)).toBe(true);
    }
  }, 60000);

  it('scrapeAllListings returns unique live jobs without crashing', async () => {
    const jobs = await index.scrapeAllListings();

    expect(Array.isArray(jobs)).toBe(true);
    expect(new Set(jobs.map(j => j.url)).size).toBe(jobs.length);
  }, 60000);

  it('has consistent jobs in the Peviitor API', async () => {
    const res = await fetch(`${API_BASE}/scraper/jobs/?cif=${companyConfig.id}&rows=500`, { signal: AbortSignal.timeout(15000) });
    expect(res.ok).toBe(true);

    const data = await res.json();
    const docs = data.data || [];

    if (data.total === 0) {
      console.log('no jobs in the API yet — skipping consistency assertions');
      return;
    }

    for (const job of docs) {
      expect(job.company).toBe(companyConfig.company);
      expect(String(job.cif)).toBe(companyConfig.id);
      expect(job.url.startsWith(CAREER_ORIGIN)).toBe(true);
    }
  }, 30000);
});
